import { MAX_TEXT_LENGTH } from '../../../shared/utils/content.ts'
import type { RenditionError } from '../../../shared/types/api.ts'

const MAX_RENDITION_LENGTH_MULTIPLIER = 2

const EXACT_TOKEN_PATTERNS = [
  /https?:\/\/[^\s<>"'，。！？、）)]+/giu,
  /[$€¥£]?\d[\d,]*(?:\.\d+)?(?:%|％|元|塊|美元|台幣|人|個|次|天|年|月|日|點|分|秒|歲|kg|g|km|m|cm)?/giu,
  /[#＃][\p{L}\p{N}_-]+/gu,
  /@[A-Za-z0-9_][A-Za-z0-9_.-]*/gu
] as const

export class InvalidRenditionError extends Error {
  readonly code: Extract<RenditionError, 'invalid_model_output' | 'token_changed' | 'output_too_long'>

  constructor(code: Extract<RenditionError, 'invalid_model_output' | 'token_changed' | 'output_too_long'>) {
    super(code)
    this.code = code
  }
}

function uniqueExactTokens(text: string): string[] {
  const tokens = new Set<string>()
  for (const pattern of EXACT_TOKEN_PATTERNS) {
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) tokens.add(match[0])
  }
  return [...tokens]
}

/**
 * 模型輸出即使來自結構化 API 仍不可信；這裡先守住明確可比對的資料，不嘗試判斷完整語意。
 */
export function validateRenditionText(originalText: string, renditionText: string): asserts renditionText is string {
  const normalized = renditionText.normalize('NFC').trim()
  if (!normalized) throw new InvalidRenditionError('invalid_model_output')
  if (normalized.length > Math.max(originalText.length * MAX_RENDITION_LENGTH_MULTIPLIER, MAX_TEXT_LENGTH)) {
    throw new InvalidRenditionError('output_too_long')
  }

  for (const token of uniqueExactTokens(originalText.normalize('NFC'))) {
    if (!normalized.includes(token)) throw new InvalidRenditionError('token_changed')
  }
}
