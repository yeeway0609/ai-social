import { SEMANTIC_SIMILARITY_VERSION } from '../../../shared/types/semanticSimilarity.ts'
import type { SemanticSimilarityError, SemanticSimilarityResult } from '../../../shared/types/semanticSimilarity.ts'

export { SEMANTIC_SIMILARITY_VERSION } from '../../../shared/types/semanticSimilarity.ts'
export type { SemanticSimilarityError, SemanticSimilarityResult } from '../../../shared/types/semanticSimilarity.ts'

export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'

export interface SemanticSimilarityInput {
  originalText: string
  rewrittenText: string
  /** 必須是 OpenAI 可用金鑰，不可直接沿用其他生成供應商的金鑰。 */
  apiKey: string | null
  model?: string
  timeoutMs?: number
}

/** 先縮放再正規化，避免極大或極小的有限向量在平方運算時溢位或歸零。 */
function unitVector(vector: readonly number[]): number[] | null {
  if (vector.length === 0 || !vector.every(Number.isFinite)) return null
  let maximum = 0
  for (const value of vector) maximum = Math.max(maximum, Math.abs(value))
  if (maximum === 0) return null
  const scaled = vector.map(value => value / maximum)
  const magnitude = Math.sqrt(scaled.reduce((sum, value) => sum + value * value, 0))
  return scaled.map(value => value / magnitude)
}

/** 回傳原始 cosine 分數，不轉成原意保留率，也不使用未校準的分級門檻。 */
export function cosineSimilarity(left: readonly number[], right: readonly number[]): number | null {
  if (left.length !== right.length) return null
  const normalizedLeft = unitVector(left)
  const normalizedRight = unitVector(right)
  if (!normalizedLeft || !normalizedRight) return null
  const score = normalizedLeft.reduce((sum, value, index) => sum + value * normalizedRight[index]!, 0)
  return Math.max(-1, Math.min(1, score))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readEmbeddings(value: unknown): { model: string, original: number[], rewritten: number[] } | null {
  if (!isRecord(value) || typeof value.model !== 'string' || !value.model.trim()) return null
  if (!Array.isArray(value.data) || value.data.length !== 2) return null
  const vectors = new Map<number, number[]>()
  for (const item of value.data) {
    if (!isRecord(item) || (item.index !== 0 && item.index !== 1) || vectors.has(item.index)) return null
    if (!Array.isArray(item.embedding) || !item.embedding.every(entry => typeof entry === 'number' && Number.isFinite(entry))) return null
    vectors.set(item.index, item.embedding)
  }
  const original = vectors.get(0)
  const rewritten = vectors.get(1)
  return original && rewritten ? { model: value.model, original, rewritten } : null
}

function unavailable(error: SemanticSimilarityError): SemanticSimilarityResult {
  return { status: 'unavailable', score: null, error }
}

/** 僅計算，不持久儲存文字或向量；呼叫端負責正式原文、登入與可讀權限。 */
export async function measureSemanticSimilarity(
  input: SemanticSimilarityInput,
  request: typeof fetch = fetch
): Promise<SemanticSimilarityResult> {
  const original = input.originalText.normalize('NFC').replace(/\r\n?/g, '\n')
  const rewritten = input.rewrittenText.normalize('NFC').replace(/\r\n?/g, '\n')
  const model = input.model ?? DEFAULT_EMBEDDING_MODEL
  const timeoutMs = input.timeoutMs ?? 5000
  if (!original.trim() || !rewritten.trim() || !model.trim()
    || !Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30_000) return unavailable('invalid_input')
  if (!input.apiKey?.trim()) return unavailable('no_embedding_credential')

  const signal = AbortSignal.timeout(timeoutMs)
  let payload: unknown
  try {
    const response = await request('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      // 不跟隨重新導向，避免文字與金鑰被送往非預期端點。
      redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.apiKey}` },
      body: JSON.stringify({ model, input: [original, rewritten], encoding_format: 'float' }),
      signal
    })
    if (response.status === 401 || response.status === 403) return unavailable('embedding_authentication_failed')
    if (response.status === 429) return unavailable('embedding_rate_limited')
    if (!response.ok) return unavailable('embedding_provider_error')
    payload = await response.json()
  } catch (error) {
    if (signal.aborted || (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'))) {
      return unavailable('embedding_timeout')
    }
    if (error instanceof SyntaxError) return unavailable('invalid_embedding_output')
    // 外部傳輸的例外可能帶請求內容，只回傳分類，不回傳例外文字。
    return unavailable('embedding_provider_error')
  }

  const embeddings = readEmbeddings(payload)
  if (!embeddings) return unavailable('invalid_embedding_output')
  const score = cosineSimilarity(embeddings.original, embeddings.rewritten)
  if (score === null) return unavailable('invalid_embedding_output')
  return { status: 'ok', score, model: embeddings.model, version: SEMANTIC_SIMILARITY_VERSION }
}
