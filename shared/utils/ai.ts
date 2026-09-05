/**
 * 可用的模型供應商。改寫功能不綁單一家，因為 demo 現場的額度來源不可控。
 * openrouter 走 OpenAI 相容介面，主要價值是有免費模型可當 demo 後備；
 * compatible 是使用者自己指定端點的任何 OpenAI 相容服務（vLLM、Ollama、LM Studio、MAX…），走 chat completions。
 */
export const AI_PROVIDERS = ['anthropic', 'openai', 'openrouter', 'compatible'] as const

export type AiProvider = typeof AI_PROVIDERS[number]

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  compatible: 'OpenAI 相容端點'
}

/**
 * 使用者自備金鑰可附帶的基本模型參數。Anthropic 新模型已棄用 temperature（只接受 1.0），
 * 所以那家不開放調整；輸出上限三家都有，只是欄位名不同，轉接層各自對映。
 */
export const AI_PROVIDER_CAPABILITIES: Record<AiProvider, { supportsTemperature: boolean, requiresBaseUrl: boolean, requiresModel: boolean }> = {
  anthropic: { supportsTemperature: false, requiresBaseUrl: false, requiresModel: false },
  openai: { supportsTemperature: true, requiresBaseUrl: false, requiresModel: false },
  openrouter: { supportsTemperature: true, requiresBaseUrl: false, requiresModel: false },
  compatible: { supportsTemperature: true, requiresBaseUrl: true, requiresModel: true }
}

export const MAX_MODEL_NAME_LENGTH = 200
export const TEMPERATURE_RANGE = { min: 0, max: 2 } as const
export const OUTPUT_TOKENS_RANGE = { min: 64, max: 8192 } as const

/** 自備金鑰隨附的模型參數；沒填的欄位用伺服器的環境預設。 */
export interface ModelOptions {
  model?: string
  temperature?: number
  maxOutputTokens?: number
  /** 只有 compatible 需要：OpenAI 相容服務的 base URL，通常以 /v1 結尾。 */
  baseUrl?: string
}

/** 只收 http／https，並擋掉雲端 metadata 位址，避免伺服器被當跳板去打內部服務。 */
export function isAllowedBaseUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    return !url.hostname.startsWith('169.254.') && url.hostname !== 'metadata.google.internal'
  } catch {
    return false
  }
}

export function isAiProvider(value: unknown): value is AiProvider {
  return AI_PROVIDERS.includes(value as AiProvider)
}

/**
 * 一次改寫的金鑰來源，會回給前端讓使用者知道自己在燒誰的額度。
 * pool 是團隊共用池，demo 途中可能耗盡；own 是使用者自備。
 */
export type CredentialSource = 'own' | 'pool'
