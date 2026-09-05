import { and, eq } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import type { H3Event } from 'h3'
import { schema, useDb } from '../../db'
import { loadContent, type LoadedContent } from '../content'
import { InvalidRenditionError, InvalidSemanticSimilarityError, isSemanticallySameAsOriginal, validateRenditionText, validateSemanticSimilarityForRendition } from './outputValidation'
import { hasRewritableContent } from './textShape'
import { NVIDIA_BASE_URL, classifyRewriteError, nvidiaApiKeys, rewrite } from './nvidia'
import { buildSystemPrompt, parseToneOutputs, wrapOriginal } from './prompt'
import { measureRewriteScale } from './scale'
import { measureSemanticSimilarities } from './semanticSimilarity'
import type { ContentSummary, Rendition, RenditionError, UserSummary } from '../../../shared/types/api'
import type { ToneId } from '../../../shared/utils/tones'
import type { SemanticSimilarityError, SemanticSimilarityResult } from '../../../shared/types/semanticSimilarity'

// 預產在背景跑、一次要回所有語氣，時限比原本讀取時即時改寫的 10 秒寬；函式上限見 nuxt.config 的 vercel.functions.maxDuration
const RENDER_TIMEOUT_MS = 25_000

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
type StoredRendition = { rendition: Rendition | null, isUnchanged: boolean }
type GeneratedToneResult = Rendition | RenditionError | null

/** 三種內容列表查出來的共同形狀；寫入端點回應自己剛建的內容時沒有 join，改寫欄位可省略。 */
export interface ContentRow extends Partial<RenditionRow> {
  id: string
  authorId: string
  originalText: string
  createdAt: Date
  author: UserSummary
}

/** 讀者身分：語氣為 null 代表尚未完成引導設定，這時所有內容都直接給原文。 */
export interface Viewer {
  id: string
  tone: ToneId | null
}

/** 給 leftJoin 用：這則內容在讀者語氣下的那一列；讀者沒語氣就給永遠不成立的條件。 */
export function renditionJoin(kind: ContentKind, contentId: AnyPgColumn, viewerTone: ToneId | null) {
  return and(
    eq(schema.renditions.kind, kind),
    eq(schema.renditions.contentId, contentId),
    viewerTone ? eq(schema.renditions.tone, viewerTone) : eq(schema.renditions.tone, '')
  )!
}

function readSemanticSimilarity(row: Partial<RenditionRow>): SemanticSimilarityResult | null {
  if (row.semanticSimilarityError) {
    return { status: 'unavailable', score: null, error: row.semanticSimilarityError as SemanticSimilarityError }
  }
  if (typeof row.semanticSimilarityScore !== 'number' || !row.semanticSimilarityModel || row.semanticSimilarityVersion !== 'cosine-nfc-v1') return null
  return { status: 'ok', score: row.semanticSimilarityScore, model: String(row.semanticSimilarityModel), version: 'cosine-nfc-v1' }
}

export function toRendition(row: Partial<RenditionRow>): Rendition | null {
  if (typeof row.renditionText !== 'string' || typeof row.renditionScale !== 'string') return null
  const semanticSimilarity = readSemanticSimilarity(row)
  if (isSemanticallySameAsOriginal(semanticSimilarity)) return null
  return { text: row.renditionText, scale: row.renditionScale as RewriteScale, semanticSimilarity }
}

function toStoredRendition(row: Partial<RenditionRow> | null | undefined): StoredRendition {
  if (!row || typeof row.renditionText !== 'string' || typeof row.renditionScale !== 'string') {
    return { rendition: null, isUnchanged: false }
  }
  const semanticSimilarity = readSemanticSimilarity(row)
  if (isSemanticallySameAsOriginal(semanticSimilarity)) return { rendition: null, isUnchanged: true }
  return { rendition: { text: row.renditionText, scale: row.renditionScale as RewriteScale, semanticSimilarity }, isUnchanged: false }
}

/** 內容剛寫入、背景預產可能還沒跑完；超過這段時間仍沒有改寫就當預產失敗，直接給原文。 */
export function isRenditionPending(rendition: Rendition | null, createdAt: Date) {
  return rendition === null && Date.now() - createdAt.getTime() < RENDITION_PENDING_WINDOW_MS
}

/**
 * 他人的內容不帶原文，前端只能拿到改寫版或另外要求「顯示原文」；
 * 自己的內容與尚未設定語氣的讀者則直接給原文。
 */
export function toContentSummary(row: ContentRow, viewer: Viewer): ContentSummary {
  const isOwn = row.authorId === viewer.id
  const stored = isOwn ? { rendition: null, isUnchanged: false } : toStoredRendition(row)
  return {
    id: row.id,
    author: row.author,
    originalText: isOwn || viewer.tone === null || stored.isUnchanged ? row.originalText : null,
    isOwn,
    createdAt: row.createdAt.toISOString(),
    rendition: stored.rendition,
    isRenditionPending: !isOwn && viewer.tone !== null && !stored.isUnchanged && isRenditionPending(stored.rendition, row.createdAt)
  }
}

export async function getViewer(viewerId: string): Promise<Viewer> {
  const [viewer] = await useDb().select({ tone: schema.users.tone }).from(schema.users).where(eq(schema.users.id, viewerId)).limit(1)
  return { id: viewerId, tone: viewer?.tone ? findTone(viewer.tone)?.id ?? null : null }
}

export async function lookupStoredRendition(kind: ContentKind, contentId: string, tone: ToneId): Promise<StoredRendition> {
  const [row] = await useDb()
    .select(renditionColumns)
    .from(schema.renditions)
    .where(and(eq(schema.renditions.kind, kind), eq(schema.renditions.contentId, contentId), eq(schema.renditions.tone, tone)))
    .limit(1)
  return toStoredRendition(row)
}

function writeSemanticSimilarity(semanticSimilarity: SemanticSimilarityResult | null) {
  if (semanticSimilarity?.status === 'ok') {
    return {
      semanticSimilarityScore: semanticSimilarity.score,
      semanticSimilarityModel: semanticSimilarity.model,
      semanticSimilarityVersion: semanticSimilarity.version,
      semanticSimilarityError: null
    }
  }
  return { semanticSimilarityScore: null, semanticSimilarityModel: null, semanticSimilarityVersion: null, semanticSimilarityError: semanticSimilarity?.error ?? null }
}

/**
 * embedding 也走 NIM，原文與所有改寫同一批送；沒設金鑰時只是相似度不可用，不影響改寫本身。
 * 這裡不丟例外而是回錯誤碼，所以金鑰輪替自己做：限流或失效就換下一把再試。
 */
async function measureGeneratedSimilarities(content: LoadedContent, texts: string[]): Promise<SemanticSimilarityResult[]> {
  const { ai } = useRuntimeConfig()
  const keys = nvidiaApiKeys()
  if (keys.length === 0) return texts.map(() => ({ status: 'unavailable', score: null, error: 'no_embedding_credential' }))
  let results: SemanticSimilarityResult[] = []
  for (const apiKey of keys) {
    results = await measureSemanticSimilarities({
      originalText: content.originalText,
      rewrittenTexts: texts,
      apiKey,
      model: ai.embeddingModel,
      embeddingsUrl: `${NVIDIA_BASE_URL}/embeddings`,
      // NIM 的檢索型 embedding 模型要求標明輸入角色，全部當 passage 才會落在同一向量空間
      extraBody: { input_type: 'passage', truncate: 'END' }
    })
    const first = results[0]
    if (!first || first.status === 'ok' || (first.error !== 'embedding_rate_limited' && first.error !== 'embedding_authentication_failed')) break
  }
  return results
}

/**
 * 一次模型呼叫產出所有目標語氣。回傳每個語氣的結果：成功是 Rendition、失敗是錯誤碼。
 * 整批呼叫失敗（逾時、金鑰、限流）時每個語氣都拿到同一個錯誤碼。
 */
async function generateAll(kind: ContentKind, content: LoadedContent, tones: readonly Tone[]): Promise<Map<string, GeneratedToneResult>> {
  const results = new Map<string, GeneratedToneResult>()

  let raw: string
  try {
    raw = await rewrite({ system: buildSystemPrompt(tones, kind, content.originalText), original: wrapOriginal(content.originalText), timeoutMs: RENDER_TIMEOUT_MS })
  } catch (err) {
    const code = classifyRewriteError(err)
    for (const tone of tones) results.set(tone.id, code)
    return results
  }

  const outputs = parseToneOutputs(raw, tones)
  const valid: Array<{ tone: Tone, text: string }> = []
  for (const tone of tones) {
    const text = outputs[tone.id]
    if (!text) {
      results.set(tone.id, 'invalid_model_output')
      continue
    }
    try {
      validateRenditionText(content.originalText, text, tone)
      valid.push({ tone, text })
    } catch (err) {
      if (!(err instanceof InvalidRenditionError)) throw err
      results.set(tone.id, err.code)
    }
  }
  if (valid.length === 0) return results

  const similarities = await measureGeneratedSimilarities(content, valid.map(item => item.text))
  valid.forEach(({ tone, text }, index) => {
    const semanticSimilarity = similarities[index]!
    try {
      validateSemanticSimilarityForRendition(semanticSimilarity)
    } catch (err) {
      if (!(err instanceof InvalidSemanticSimilarityError)) throw err
      results.set(tone.id, err.code)
      return
    }
    if (isSemanticallySameAsOriginal(semanticSimilarity)) {
      results.set(tone.id, null)
      return
    }
    results.set(tone.id, { text, scale: measureRewriteScale(content.originalText, text), semanticSimilarity })
  })
  return results
}

/**
 * 短內容不改寫時存的那一列：文字就是原文，相似度依定義為 1，讀取端走「等同原文」的路徑顯示原文、
 * 不再進入預產中的等待，補跑也不會再打模型。model 記 identity 表明這個分數沒跑 embedding。
 */
function identityRendition(kind: ContentKind, contentId: string, tone: Tone, originalText: string): typeof schema.renditions.$inferInsert {
  return {
    kind,
    contentId,
    tone: tone.id,
    text: originalText,
    scale: 'nearly_original',
    semanticSimilarityScore: 1,
    semanticSimilarityModel: 'identity',
    semanticSimilarityVersion: 'cosine-nfc-v1',
    semanticSimilarityError: null
  }
}

/**
 * 改寫只在這裡產生：內容寫入後對所有預設語氣各存一份，讀者之後直接撈、不再呼叫模型。
 * 貼文、留言、訊息一視同仁全語氣預產，讀者事後換語氣也有東西看。
 * 一則內容只打一次模型、一次 embedding，避免撞到 NIM 的每分鐘請求上限。
 * 已有的語氣略過，所以補跑是安全的；失敗的語氣留空，讀者看到原文。
 * 沒有命題可改的短內容（純感嘆、表情、幾個字）不叫模型，直接以原文落地，讀者立刻看到標「原文」的原句。
 */
export async function pregenerateRenditions(kind: ContentKind, id: string) {
  const content = await loadContent(kind, id)
  if (!content) return { generated: 0, failed: 0, skipped: 0 }

  const existing = await useDb()
    .select({ tone: schema.renditions.tone })
    .from(schema.renditions)
    .where(and(eq(schema.renditions.kind, kind), eq(schema.renditions.contentId, id)))
  const existingTones = new Set(existing.map(row => row.tone))
  const targets = TONES.filter(tone => !existingTones.has(tone.id))
  if (targets.length === 0) return { generated: 0, failed: 0, skipped: 0 }

  if (!hasRewritableContent(content.originalText)) {
    await useDb().insert(schema.renditions).values(targets.map(tone => identityRendition(kind, id, tone, content.originalText))).onConflictDoNothing()
    return { generated: 0, failed: 0, skipped: targets.length }
  }

  const results = await generateAll(kind, content, targets)
  let generated = 0
  let failed = 0
  for (const tone of targets) {
    const result = results.get(tone.id)
    if (result === null) continue
    if (!result || typeof result === 'string') {
      failed++
      console.warn(`[renditions] ${kind}/${id} ${tone.id} 預產失敗：${result ?? 'unknown'}`)
      continue
    }
    // 兩個寫入者同時預產同一份時，後到的直接丟掉，之後都以先存的為準
    await useDb()
      .insert(schema.renditions)
      .values({ kind, contentId: id, tone: tone.id, text: result.text, scale: result.scale, ...writeSemanticSimilarity(result.semanticSimilarity) })
      .onConflictDoNothing()
    generated++
  }
  return { generated, failed, skipped: 0 }
}

/** 寫入端點用：回應先送出，預產在背景跑；平台不支援 waitUntil 時退回同步等待。 */
export function schedulePregeneration(event: H3Event, kind: ContentKind, id: string) {
  const work = pregenerateRenditions(kind, id).catch(() => undefined)
  if (typeof event.waitUntil === 'function') event.waitUntil(work)
  return work
}

/** 內容刪除時順手清掉它的改寫；沒有外鍵可 cascade，因為 contentId 橫跨三張表。 */
export async function deleteRenditions(kind: ContentKind, contentId: string) {
  await useDb()
    .delete(schema.renditions)
    .where(and(eq(schema.renditions.kind, kind), eq(schema.renditions.contentId, contentId)))
}
