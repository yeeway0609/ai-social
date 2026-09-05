/**
 * 可用的模型供應商。改寫功能不綁單一家，因為 demo 現場的額度來源不可控。
 * openrouter 走 OpenAI 相容介面，主要價值是有免費模型可當 demo 後備。
 */
export const AI_PROVIDERS = ['anthropic', 'openai', 'openrouter'] as const

export type AiProvider = typeof AI_PROVIDERS[number]

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  openrouter: 'OpenRouter'
}

/**
 * 使用者自備金鑰可附帶的基本模型參數。Anthropic 新模型已棄用 temperature（只接受 1.0），
 * 所以那家不開放調整；輸出上限三家都有，只是欄位名不同，轉接層各自對映。
 */
export const AI_PROVIDER_CAPABILITIES: Record<AiProvider, { supportsTemperature: boolean }> = {
  anthropic: { supportsTemperature: false },
  openai: { supportsTemperature: true },
  openrouter: { supportsTemperature: true }
}

export const MAX_MODEL_NAME_LENGTH = 200
export const TEMPERATURE_RANGE = { min: 0, max: 2 } as const
export const OUTPUT_TOKENS_RANGE = { min: 64, max: 8192 } as const

/** 自備金鑰隨附的模型參數；沒填的欄位用伺服器的環境預設。 */
export interface ModelOptions {
  model?: string
  temperature?: number
  maxOutputTokens?: number
}

export function isAiProvider(value: unknown): value is AiProvider {
  return AI_PROVIDERS.includes(value as AiProvider)
}

/**
 * 一次改寫的金鑰來源，會回給前端讓使用者知道自己在燒誰的額度。
 * pool 是團隊共用池，demo 途中可能耗盡；own 是使用者自備。
 */
export type CredentialSource = 'own' | 'pool'
