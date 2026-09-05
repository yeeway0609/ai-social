import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

/**
 * 每家供應商收斂成同一個呼叫形狀：吃系統指示與原文、回改寫後的純文字。
 * 之所以不共用一套 SDK 抽象，是因為只需要「一次無狀態的文字轉文字」，
 * 各自五行就寫完，包一層通用 client 只會多一層要維護的對映。
 */
export type RewriteFn = (args: {
  apiKey: string
  model: string
  system: string
  original: string
  timeoutMs: number
}) => Promise<string>

const anthropic: RewriteFn = async ({ apiKey, model, system, original, timeoutMs }) => {
  const response = await new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 0 }).messages.create({
    model,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: original }]
  })
  return response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim()
}

const openai: RewriteFn = async ({ apiKey, model, system, original, timeoutMs }) => {
  const response = await new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 0 }).responses.create({
    model,
    instructions: system,
    input: original
  })
  return response.output_text.trim()
}

// OpenRouter 相容 OpenAI 的 chat completions；免費模型帶 :free 後綴，額度由 OpenRouter 帳戶決定
const openrouter: RewriteFn = async ({ apiKey, model, system, original, timeoutMs }) => {
  const response = await new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    timeout: timeoutMs,
    maxRetries: 0
  }).chat.completions.create({
    model,
    messages: [{ role: 'system', content: system }, { role: 'user', content: original }]
  })
  return response.choices[0]?.message.content?.trim() ?? ''
}

/**
 * 自架模型（例如 Qwen3）走 OpenAI Responses 相容端點。
 * Qwen3 這類有思考模式的模型可能把 <think> 段落夾在輸出裡，改寫只要最後的正文。
 */
const local: RewriteFn = async ({ apiKey, model, system, original, timeoutMs }) => {
  const { ai } = useRuntimeConfig()
  if (!ai.localBaseUrl) throw new Error('NUXT_AI_LOCAL_BASE_URL 未設定')
  const response = await new OpenAI({ apiKey, baseURL: ai.localBaseUrl, timeout: timeoutMs, maxRetries: 0 }).responses.create({
    model,
    instructions: system,
    input: original
  })
  return stripThinking(response.output_text)
}

function stripThinking(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

export const REWRITE_FNS: Record<AiProvider, RewriteFn> = { anthropic, openai, openrouter, local }

export function modelFor(provider: AiProvider) {
  const { ai } = useRuntimeConfig()
  return { anthropic: ai.modelAnthropic, openai: ai.modelOpenai, openrouter: ai.modelOpenrouter, local: ai.modelLocal }[provider]
}

/** SDK 的逾時與額度錯誤各自對應不同的前端處置（重試 vs 導去設定金鑰），所以分開辨識。 */
export function classifyProviderError(err: unknown): RenditionResult['error'] {
  if (err instanceof Anthropic.APIConnectionTimeoutError || err instanceof OpenAI.APIConnectionTimeoutError) return 'timeout'
  if (err instanceof Anthropic.AuthenticationError || err instanceof OpenAI.AuthenticationError) return 'no_ai_credential'
  if (err instanceof Anthropic.RateLimitError || err instanceof OpenAI.RateLimitError) return 'no_ai_credential'
  return 'provider_error'
}
