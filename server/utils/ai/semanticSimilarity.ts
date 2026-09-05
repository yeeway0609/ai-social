import { SEMANTIC_SIMILARITY_VERSION } from '../../../shared/types/semanticSimilarity.ts'
import type { SemanticSimilarityError, SemanticSimilarityResult } from '../../../shared/types/semanticSimilarity.ts'

const DEFAULT_TIMEOUT_MS = 5000

export interface SemanticSimilarityInput {
  originalText: string
  rewrittenText: string
  /** 要能打 embeddingsUrl 所指服務的金鑰。 */
  apiKey: string | null
  model: string
  timeoutMs?: number
  /** OpenAI 相容的 embeddings 端點。 */
  embeddingsUrl: string
  /** 端點專屬的額外參數（例如 NIM 的 input_type），原樣併進請求 body。 */
  extraBody?: Record<string, unknown>
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

function readEmbeddings(value: unknown, count: number): { model: string, vectors: number[][] } | null {
  if (!isRecord(value) || typeof value.model !== 'string' || !value.model.trim()) return null
  if (!Array.isArray(value.data) || value.data.length !== count) return null
  const vectors = new Map<number, number[]>()
  for (const item of value.data) {
    if (!isRecord(item) || typeof item.index !== 'number' || item.index < 0 || item.index >= count || vectors.has(item.index)) return null
    if (!Array.isArray(item.embedding) || !item.embedding.every(entry => typeof entry === 'number' && Number.isFinite(entry))) return null
    vectors.set(item.index, item.embedding)
  }
  if (vectors.size !== count) return null
  return { model: value.model, vectors: Array.from({ length: count }, (_, index) => vectors.get(index)!) }
}

function unavailable(error: SemanticSimilarityError): SemanticSimilarityResult {
  return { status: 'unavailable', score: null, error }
}

/** 僅計算，不持久儲存文字或向量；呼叫端負責正式原文、登入與可讀權限。 */
export async function measureSemanticSimilarity(
  input: SemanticSimilarityInput,
  request: typeof fetch = fetch
): Promise<SemanticSimilarityResult> {
  const [result] = await measureSemanticSimilarities({ ...input, rewrittenTexts: [input.rewrittenText] }, request)
  return result!
}

export type SemanticSimilaritiesInput = Omit<SemanticSimilarityInput, 'rewrittenText'> & { rewrittenTexts: string[] }

/**
 * 原文與多段改寫一次送進同一個 embeddings 請求（一則內容的所有語氣共用一次呼叫），
 * 回傳順序與 rewrittenTexts 對齊；任何一段輸入不合法整批都算 invalid_input。
 */
export async function measureSemanticSimilarities(
  input: SemanticSimilaritiesInput,
  request: typeof fetch = fetch
): Promise<SemanticSimilarityResult[]> {
  const normalize = (text: string) => text.normalize('NFC').replace(/\r\n?/g, '\n')
  const original = normalize(input.originalText)
  const rewrittens = input.rewrittenTexts.map(normalize)
  const model = input.model
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const all = (error: SemanticSimilarityError) => rewrittens.map(() => unavailable(error))
  if (!original.trim() || rewrittens.length === 0 || rewrittens.some(text => !text.trim()) || !model.trim()
    || !Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30_000) return all('invalid_input')
  if (!input.apiKey?.trim()) return all('no_embedding_credential')

  const signal = AbortSignal.timeout(timeoutMs)
  let payload: unknown
  try {
    const response = await request(input.embeddingsUrl, {
      method: 'POST',
      // 不跟隨重新導向，避免文字與金鑰被送往非預期端點。
      redirect: 'error',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${input.apiKey}` },
      body: JSON.stringify({ ...input.extraBody, model, input: [original, ...rewrittens], encoding_format: 'float' }),
      signal
    })
    if (response.status === 401 || response.status === 403) return all('embedding_authentication_failed')
    if (response.status === 429) return all('embedding_rate_limited')
    if (!response.ok) return all('embedding_service_error')
    payload = await response.json()
  } catch (error) {
    if (signal.aborted || (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'))) {
      return all('embedding_timeout')
    }
    if (error instanceof SyntaxError) return all('invalid_embedding_output')
    // 外部傳輸的例外可能帶請求內容，只回傳分類，不回傳例外文字。
    return all('embedding_service_error')
  }

  const embeddings = readEmbeddings(payload, rewrittens.length + 1)
  if (!embeddings) return all('invalid_embedding_output')
  const [originalVector, ...rewrittenVectors] = embeddings.vectors
  return rewrittenVectors.map((vector) => {
    const score = cosineSimilarity(originalVector!, vector)
    return score === null ? unavailable('invalid_embedding_output') : { status: 'ok', score, model: embeddings.model, version: SEMANTIC_SIMILARITY_VERSION }
  })
}
