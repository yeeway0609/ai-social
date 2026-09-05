import { createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { schema, useDb } from '../../db'
import { loadContent, type LoadedContent } from '../content'
import { readOwnCredential, resolveCredential, resolvePoolCredential, type ResolvedCredential } from './credentials'
import { buildSystemPrompt, wrapOriginal } from './prompt'
import { InvalidRenditionError, validateRenditionText } from './outputValidation'
import { classifyProviderError, modelFor, REWRITE_FNS } from './providers'
import { measureRewriteScale } from './scale'
import { DEFAULT_EMBEDDING_MODEL, measureSemanticSimilarity } from './semanticSimilarity'
import { parseRenderBatchRequest, validateRenderResultIdentities } from '../../../shared/utils/renderContract'
import type { RenderBatchRequest, RenderBatchResult } from '../../../shared/types/api'
import type { SemanticSimilarityError, SemanticSimilarityResult } from '../../../shared/types/semanticSimilarity'

const RENDER_TIMEOUT_MS = 10_000

export class ContentNotFoundError extends Error {
  readonly code = 'content_not_found'
}

interface GeneratedRendition {
  text: string
  scale: RewriteScale
  semanticSimilarity: SemanticSimilarityResult
}

class GenerationFailure extends Error {
  readonly code: NonNullable<RenditionResult['error']>

  constructor(code: NonNullable<RenditionResult['error']>) {
    super(code)
    this.code = code
  }
}

function hashInstruction(customInstruction: string | null) {
  return customInstruction ? createHash('sha256').update(customInstruction).digest('hex') : ''
}

async function readCache(kind: ContentKind, contentId: string, tone: string, instructionHash: string) {
  const [row] = await useDb()
    .select({
      text: schema.renditions.text,
      scale: schema.renditions.scale,
      semanticSimilarityScore: schema.renditions.semanticSimilarityScore,
      semanticSimilarityModel: schema.renditions.semanticSimilarityModel,
      semanticSimilarityVersion: schema.renditions.semanticSimilarityVersion,
      semanticSimilarityError: schema.renditions.semanticSimilarityError
    })
    .from(schema.renditions)
    .where(and(
      eq(schema.renditions.kind, kind),
      eq(schema.renditions.contentId, contentId),
      eq(schema.renditions.tone, tone),
      eq(schema.renditions.instructionHash, instructionHash)
    ))
    .limit(1)
  return row ? { text: row.text, scale: row.scale as RewriteScale, semanticSimilarity: readSemanticSimilarity(row) } : null
}

async function writeCache(kind: ContentKind, contentId: string, tone: string, instructionHash: string, generated: GeneratedRendition) {
  // 兩個讀者同時觸發同一份改寫時，後到的那份直接丟掉，兩邊看到的字句可能不同但之後都以先存的為準
  await useDb()
    .insert(schema.renditions)
    .values({
      kind,
      contentId,
      tone,
      instructionHash,
      text: generated.text,
      scale: generated.scale,
      ...writeSemanticSimilarity(generated.semanticSimilarity)
    })
    .onConflictDoNothing()
}

function readSemanticSimilarity(row: {
  semanticSimilarityScore: number | null
  semanticSimilarityModel: string | null
  semanticSimilarityVersion: string | null
  semanticSimilarityError: string | null
}): SemanticSimilarityResult | null {
  if (row.semanticSimilarityError) {
    return { status: 'unavailable', score: null, error: row.semanticSimilarityError as SemanticSimilarityError }
  }
  if (row.semanticSimilarityScore === null || !row.semanticSimilarityModel || row.semanticSimilarityVersion !== 'cosine-nfc-v1') return null
  return { status: 'ok', score: row.semanticSimilarityScore, model: row.semanticSimilarityModel, version: 'cosine-nfc-v1' }
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
  return {
    semanticSimilarityScore: null,
    semanticSimilarityModel: null,
    semanticSimilarityVersion: null,
    semanticSimilarityError: semanticSimilarity.error
  }
}

async function measureGeneratedSimilarity(content: LoadedContent, text: string, ownCredential: ResolvedCredential | null): Promise<SemanticSimilarityResult> {
  const credential = ownCredential?.provider === 'openai' ? ownCredential : resolvePoolCredential('openai')
  return measureSemanticSimilarity({
    originalText: content.originalText,
    rewrittenText: text,
    apiKey: credential?.apiKey ?? null,
    model: DEFAULT_EMBEDDING_MODEL
  })
}

async function generate(content: LoadedContent, tone: Tone, customInstruction: string | null, credential: ResolvedCredential, ownCredential: ResolvedCredential | null): Promise<GeneratedRendition> {
  const { ai } = useRuntimeConfig()
  if (ai.mock) return { text: `（${tone.label}）${content.originalText}`, scale: 'light', semanticSimilarity: { status: 'unavailable', score: null, error: 'no_embedding_credential' } }

  let text: string
  try {
    text = await REWRITE_FNS[credential.provider]({
      apiKey: credential.apiKey,
      model: modelFor(credential.provider, credential.model),
      system: buildSystemPrompt(tone, customInstruction),
      original: wrapOriginal(content.originalText),
      timeoutMs: RENDER_TIMEOUT_MS,
      temperature: credential.temperature,
      maxOutputTokens: credential.maxOutputTokens,
      baseUrl: credential.baseUrl
    })
  } catch (err) {
    throw new GenerationFailure(classifyProviderError(err) ?? 'provider_error')
  }
  try {
    validateRenditionText(content.originalText, text)
  } catch (err) {
    if (err instanceof InvalidRenditionError) throw new GenerationFailure(err.code)
    throw err
  }
  return {
    text,
    scale: measureRewriteScale(content.originalText, text),
    semanticSimilarity: await measureGeneratedSimilarity(content, text, ownCredential)
  }
}

/**
 * 改寫服務的唯一入口：給一則內容與一位讀者，回那位讀者該看到的樣子。
 * 預設語氣先查快取，沒有才生成並存回；自訂指示必須有自備金鑰，其結果以指示雜湊另存。
 * 失敗一律退回原文並帶錯誤碼，不丟例外——feed 上任何一則都不能因為模型出問題而變空白。
 */
export async function renderContent(kind: ContentKind, id: string, viewerId: string, ownCredential: ResolvedCredential | null): Promise<RenditionResult> {
  const content = await loadContent(kind, id)
  if (!content) throw new ContentNotFoundError()

  const original = (error: RenditionResult['error'] = null, source: CredentialSource | null = null): RenditionResult =>
    ({ kind, id, text: content.originalText, isOriginal: true, scale: null, semanticSimilarity: null, source, error })

  if (content.authorId === viewerId) return original()

  const [viewer] = await useDb()
    .select({ tone: schema.users.tone, customInstruction: schema.users.customInstruction })
    .from(schema.users)
    .where(eq(schema.users.id, viewerId))
    .limit(1)
  // tone 為 null 代表尚未完成引導設定；值域外的舊值退到目前預設語氣，避免舊帳號突然只看到原文
  const tone = viewer?.tone ? (findTone(viewer.tone) ?? TONES[0]) : undefined
  if (!tone) return original()

  const credential = resolveCredential(ownCredential)
  // 自訂指示只在這次請求帶了自備金鑰時生效；沒帶就退回純預設語氣的共用快取
  const customInstruction = credential?.source === 'own' ? (viewer?.customInstruction ?? null) : null
  const instructionHash = hashInstruction(customInstruction)
  const shouldPersist = !customInstruction

  const cached = shouldPersist ? await readCache(kind, id, tone.id, instructionHash) : null
  if (cached) {
    return { kind, id, text: cached.text, isOriginal: false, scale: cached.scale, semanticSimilarity: cached.semanticSimilarity, source: null, error: null }
  }

  if (!credential) return original('no_ai_credential')

  try {
    const generated = await generate(content, tone, customInstruction, credential, ownCredential)
    if (shouldPersist) await writeCache(kind, id, tone.id, instructionHash, generated)
    return {
      kind,
      id,
      text: generated.text,
      isOriginal: false,
      scale: generated.scale,
      semanticSimilarity: generated.semanticSimilarity,
      source: credential.source,
      error: null
    }
  } catch (err) {
    if (err instanceof GenerationFailure) return original(err.code, credential.source)
    throw err
  }
}

/** 批次協調層保持請求順序；單篇模型失敗回原文，不讓其他篇一起失敗。 */
export async function renderContentBatch(request: RenderBatchRequest, viewerId: string, ownCredential: ResolvedCredential | null): Promise<RenderBatchResult> {
  const normalized = parseRenderBatchRequest(request)
  const items = await Promise.all(normalized.items.map(async item => ({
    ...await renderContent(item.kind, item.id, viewerId, ownCredential)
  })))
  validateRenderResultIdentities(normalized, items)
  return { version: 'rendition-batch-v1', items }
}

/**
 * 內容寫入時預先產出所有預設語氣的改寫，讀者捲到時直接命中快取。
 * 燒的是請求帶來的自備金鑰（作者瀏覽器裡的那把）、其次共用池。
 * 任何一個語氣失敗就略過，讀者端會惰性補生成。訊息只需要收件人當下的語氣，傳 toneIds 限制範圍。
 */
export async function pregenerateRenditions(kind: ContentKind, id: string, ownCredential: ResolvedCredential | null, toneIds?: string[]) {
  const content = await loadContent(kind, id)
  if (!content) return { generated: 0, failed: 0 }

  const credential = resolveCredential(ownCredential)
  if (!credential) return { generated: 0, failed: 0 }

  const targets = TONES.filter(tone => !toneIds || toneIds.includes(tone.id))
  let generated = 0
  let failed = 0
  await Promise.all(targets.map(async (tone) => {
    if (await readCache(kind, id, tone.id, '')) return
    try {
      await writeCache(kind, id, tone.id, '', await generate(content, tone, null, credential, ownCredential))
      generated++
    } catch {
      failed++
    }
  }))
  return { generated, failed }
}

/** 寫入端點用：回應先送出，預產在背景跑；平台不支援 waitUntil 時退回同步等待。 */
export function schedulePregeneration(event: H3Event, kind: ContentKind, id: string, toneIds?: string[]) {
  const work = pregenerateRenditions(kind, id, readOwnCredential(event), toneIds).catch(() => undefined)
  if (typeof event.waitUntil === 'function') event.waitUntil(work)
  return work
}

/** 內容刪除時順手清掉它的改寫；沒有外鍵可 cascade，因為 contentId 橫跨三張表。 */
export async function deleteRenditions(kind: ContentKind, contentId: string) {
  await useDb()
    .delete(schema.renditions)
    .where(and(eq(schema.renditions.kind, kind), eq(schema.renditions.contentId, contentId)))
}
