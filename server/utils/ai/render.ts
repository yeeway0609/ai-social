import { and, eq } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import type { H3Event } from 'h3'
import { schema, useDb } from '../../db'
import { loadContent, type LoadedContent } from '../content'
import { InvalidRenditionError, validateRenditionText } from './outputValidation'
import { NVIDIA_BASE_URL, classifyProviderError, rewrite } from './nvidia'
import { buildSystemPrompt, wrapOriginal } from './prompt'
import { measureRewriteScale } from './scale'
import { measureSemanticSimilarity } from './semanticSimilarity'
import type { Rendition, RenditionError } from '../../../shared/types/api'
import type { SemanticSimilarityError, SemanticSimilarityResult } from '../../../shared/types/semanticSimilarity'

const RENDER_TIMEOUT_MS = 10_000

class GenerationFailure extends Error {
  readonly code: RenditionError

  constructor(code: RenditionError) {
    super(code)
    this.code = code
  }
}

/** 列表查詢 left join renditions 時要選的欄位；沒命中時整組都是 null。 */
export const renditionColumns = {
  renditionText: schema.renditions.text,
  renditionScale: schema.renditions.scale,
  semanticSimilarityScore: schema.renditions.semanticSimilarityScore,
  semanticSimilarityModel: schema.renditions.semanticSimilarityModel,
  semanticSimilarityVersion: schema.renditions.semanticSimilarityVersion,
  semanticSimilarityError: schema.renditions.semanticSimilarityError
}

type RenditionRow = { [K in keyof typeof renditionColumns]: string | number | null }

/** 給 leftJoin 用：這則內容在讀者語氣下的那一列；讀者沒語氣就給永遠不成立的條件。 */
export function renditionJoin(kind: ContentKind, contentId: AnyPgColumn, viewerTone: string | null) {
  return and(
    eq(schema.renditions.kind, kind),
    eq(schema.renditions.contentId, contentId),
    viewerTone ? eq(schema.renditions.tone, viewerTone) : eq(schema.renditions.tone, '')
  )!
}

function readSemanticSimilarity(row: RenditionRow): SemanticSimilarityResult | null {
  if (row.semanticSimilarityError) {
    return { status: 'unavailable', score: null, error: row.semanticSimilarityError as SemanticSimilarityError }
  }
  if (typeof row.semanticSimilarityScore !== 'number' || !row.semanticSimilarityModel || row.semanticSimilarityVersion !== 'cosine-nfc-v1') return null
  return { status: 'ok', score: row.semanticSimilarityScore, model: String(row.semanticSimilarityModel), version: 'cosine-nfc-v1' }
}

export function toRendition(row: RenditionRow): Rendition | null {
  if (typeof row.renditionText !== 'string' || typeof row.renditionScale !== 'string') return null
  return { text: row.renditionText, scale: row.renditionScale as RewriteScale, semanticSimilarity: readSemanticSimilarity(row) }
}

/** 內容剛寫入、背景預產可能還沒跑完；超過這段時間仍沒有改寫就當預產失敗，直接給原文。 */
export function isRenditionPending(rendition: Rendition | null, createdAt: Date) {
  return rendition === null && Date.now() - createdAt.getTime() < RENDITION_PENDING_WINDOW_MS
}

export async function getViewerTone(viewerId: string): Promise<string | null> {
  const [viewer] = await useDb().select({ tone: schema.users.tone }).from(schema.users).where(eq(schema.users.id, viewerId)).limit(1)
  // 值域外的舊值退到目前預設語氣，避免舊帳號突然只看到原文
  return viewer?.tone ? (findTone(viewer.tone) ?? TONES[0]!).id : null
}

export async function lookupRendition(kind: ContentKind, contentId: string, tone: string): Promise<Rendition | null> {
  const [row] = await useDb()
    .select(renditionColumns)
    .from(schema.renditions)
    .where(and(eq(schema.renditions.kind, kind), eq(schema.renditions.contentId, contentId), eq(schema.renditions.tone, tone)))
    .limit(1)
  return row ? toRendition(row) : null
}

function writeSemanticSimilarity(semanticSimilarity: SemanticSimilarityResult) {
  if (semanticSimilarity.status === 'ok') {
    return {
      semanticSimilarityScore: semanticSimilarity.score,
      semanticSimilarityModel: semanticSimilarity.model,
      semanticSimilarityVersion: semanticSimilarity.version,
      semanticSimilarityError: null
    }
  }
  return { semanticSimilarityScore: null, semanticSimilarityModel: null, semanticSimilarityVersion: null, semanticSimilarityError: semanticSimilarity.error }
}

/** embedding 也走 NIM；沒設金鑰時只是相似度不可用，不影響改寫本身。 */
function measureGeneratedSimilarity(content: LoadedContent, text: string): Promise<SemanticSimilarityResult> {
  const { ai } = useRuntimeConfig()
  return measureSemanticSimilarity({
    originalText: content.originalText,
    rewrittenText: text,
    apiKey: ai.nvidiaApiKey || null,
    model: ai.embeddingModel,
    embeddingsUrl: `${NVIDIA_BASE_URL}/embeddings`,
    // NIM 的檢索型 embedding 模型要求標明輸入角色，兩段都當 passage 才會落在同一向量空間
    extraBody: { input_type: 'passage', truncate: 'END' }
  })
}

async function generate(content: LoadedContent, tone: Tone): Promise<Rendition> {
  const { ai } = useRuntimeConfig()
  if (ai.mock) return { text: `（${tone.label}）${content.originalText}`, scale: 'light', semanticSimilarity: { status: 'unavailable', score: null, error: 'no_embedding_credential' } }

  let text: string
  try {
    text = await rewrite({ system: buildSystemPrompt(tone), original: wrapOriginal(content.originalText), timeoutMs: RENDER_TIMEOUT_MS })
  } catch (err) {
    throw new GenerationFailure(classifyProviderError(err))
  }
  try {
    validateRenditionText(content.originalText, text)
  } catch (err) {
    if (err instanceof InvalidRenditionError) throw new GenerationFailure(err.code)
    throw err
  }
  return { text, scale: measureRewriteScale(content.originalText, text), semanticSimilarity: await measureGeneratedSimilarity(content, text) }
}

/**
 * 改寫只在這裡產生：內容寫入後對每個預設語氣各存一份，讀者之後直接撈、不再呼叫模型。
 * 已有的語氣略過，所以補跑是安全的；失敗的語氣留空，讀者看到原文。
 * 訊息只需要收件人當下的語氣，傳 toneIds 限制範圍。
 */
export async function pregenerateRenditions(kind: ContentKind, id: string, toneIds?: string[]) {
  const content = await loadContent(kind, id)
  if (!content) return { generated: 0, failed: 0 }

  const targets = TONES.filter(tone => !toneIds || toneIds.includes(tone.id))
  let generated = 0
  let failed = 0
  await Promise.all(targets.map(async (tone) => {
    if (await lookupRendition(kind, id, tone.id)) return
    try {
      const rendition = await generate(content, tone)
      // 兩個寫入者同時預產同一份時，後到的直接丟掉，之後都以先存的為準
      await useDb()
        .insert(schema.renditions)
        .values({ kind, contentId: id, tone: tone.id, text: rendition.text, scale: rendition.scale, ...writeSemanticSimilarity(rendition.semanticSimilarity ?? { status: 'unavailable', score: null, error: 'invalid_input' }) })
        .onConflictDoNothing()
      generated++
    } catch (err) {
      failed++
      console.warn(`[renditions] ${kind}/${id} ${tone.id} 預產失敗：${err instanceof GenerationFailure ? err.code : 'unknown'}`)
    }
  }))
  return { generated, failed }
}

/** 寫入端點用：回應先送出，預產在背景跑；平台不支援 waitUntil 時退回同步等待。 */
export function schedulePregeneration(event: H3Event, kind: ContentKind, id: string, toneIds?: string[]) {
  const work = pregenerateRenditions(kind, id, toneIds).catch(() => undefined)
  if (typeof event.waitUntil === 'function') event.waitUntil(work)
  return work
}

/** 內容刪除時順手清掉它的改寫；沒有外鍵可 cascade，因為 contentId 橫跨三張表。 */
export async function deleteRenditions(kind: ContentKind, contentId: string) {
  await useDb()
    .delete(schema.renditions)
    .where(and(eq(schema.renditions.kind, kind), eq(schema.renditions.contentId, contentId)))
}
