import { CONTENT_KINDS, MAX_TEXT_LENGTH } from './content.ts'
import type { RenderBatchRequest, RenderRequest } from '../types/api.ts'

export const MAX_RENDER_BATCH_COUNT = 6
export const RENDER_BATCH_VERSION = 'rendition-batch-v1'

export type RenderContractErrorCode = 'invalid_render_request' | 'duplicate_content' | 'invalid_original_text' | 'result_identity_mismatch'

export class RenderContractError extends Error {
  readonly code: RenderContractErrorCode

  constructor(code: RenderContractErrorCode) {
    super(code)
    this.code = code
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 同一 UUID 在不同內容表不代表同一內容，識別鍵必須包含 kind。 */
function identity(item: RenderRequest): string {
  return `${item.kind}:${item.id.toLowerCase()}`
}

/** 純契約驗證；新增 HTTP 端點時仍須依專案慣例使用 Zod 驗證 body。 */
export function parseRenderBatchRequest(value: unknown): RenderBatchRequest {
  if (!isRecord(value) || Object.keys(value).some(key => key !== 'items') || !Array.isArray(value.items)
    || value.items.length === 0 || value.items.length > MAX_RENDER_BATCH_COUNT) {
    throw new RenderContractError('invalid_render_request')
  }

  const keys = new Set<string>()
  const items: RenderRequest[] = []
  for (const item of value.items) {
    if (!isRecord(item) || Object.keys(item).some(key => key !== 'kind' && key !== 'id')
      || typeof item.kind !== 'string' || !CONTENT_KINDS.some(kind => kind === item.kind)
      || typeof item.id !== 'string' || !UUID.test(item.id)) {
      throw new RenderContractError('invalid_render_request')
    }
    const request = { kind: item.kind as RenderRequest['kind'], id: item.id.toLowerCase() }
    const key = identity(request)
    if (keys.has(key)) throw new RenderContractError('duplicate_content')
    keys.add(key)
    items.push(request)
  }
  return { items }
}

/** 與既有發文端點的 Zod max 一致，按 UTF-16 code unit 計數，不修改正式原文。 */
export function validateOriginalText(originalText: unknown): asserts originalText is string {
  if (typeof originalText !== 'string' || !originalText.trim() || originalText.length > MAX_TEXT_LENGTH) {
    throw new RenderContractError('invalid_original_text')
  }
}

/** 批次回應保留請求順序；模型完成順序不能改變貼文與結果的對應。 */
export function validateRenderResultIdentities(request: RenderBatchRequest, results: readonly RenderRequest[]): void {
  const normalized = parseRenderBatchRequest(request)
  if (normalized.items.length !== results.length || normalized.items.some((item, index) => {
    const result = results[index]
    return !result || typeof result.id !== 'string' || identity(item) !== identity(result)
  })) {
    throw new RenderContractError('result_identity_mismatch')
  }
}
