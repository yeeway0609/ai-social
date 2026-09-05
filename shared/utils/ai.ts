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

export function isAiProvider(value: unknown): value is AiProvider {
  return AI_PROVIDERS.includes(value as AiProvider)
}

/**
 * 一次改寫的金鑰來源，會回給前端讓使用者知道自己在燒誰的額度。
 * pool 是團隊共用池，demo 途中可能耗盡；own 是使用者自備。
 */
export type CredentialSource = 'own' | 'pool'
