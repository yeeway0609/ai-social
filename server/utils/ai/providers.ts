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
  temperature?: number
  maxOutputTokens?: number
  /** 只有 compatible 用：使用者指定的 OpenAI 相容端點。 */
  baseUrl?: string
}) => Promise<string>

const DEFAULT_MAX_OUTPUT_TOKENS = 1024

const anthropic: RewriteFn = async ({ apiKey, model, system, original, timeoutMs, maxOutputTokens }) => {
  const response = await new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 0 }).messages.create({
    model,
    max_tokens: maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
    system,
    messages: [{ role: 'user', content: original }]
  })
  return response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim()
}

const openai: RewriteFn = async ({ apiKey, model, system, original, timeoutMs, temperature, maxOutputTokens }) => {
  const response = await new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 0 }).responses.create({
    model,
    instructions: system,
    input: original,
    temperature,
    max_output_tokens: maxOutputTokens
  })
  return response.output_text.trim()
}

// OpenRouter 相容 OpenAI 的 chat completions；免費模型帶 :free 後綴，額度由 OpenRouter 帳戶決定
const openrouter: RewriteFn = async ({ apiKey, model, system, original, timeoutMs, temperature, maxOutputTokens }) => {
  const response = await new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    timeout: timeoutMs,
    maxRetries: 0
  }).chat.completions.create({
    model,
    messages: [{ role: 'system', content: system }, { role: 'user', content: original }],
    temperature,
    max_tokens: maxOutputTokens
  })
  return response.choices[0]?.message.content?.trim() ?? ''
}

/**
 * 使用者自己指定端點的 OpenAI 相容服務，走最普及的 chat completions。
 * 本地推論框架（Qwen 等）可能把思考過程用 <think> 夾在輸出裡，改寫只要正文。
 */
const compatible: RewriteFn = async ({ apiKey, model, system, original, timeoutMs, temperature, maxOutputTokens, baseUrl }) => {
  if (!baseUrl) throw new Error('OpenAI 相容端點缺少 base URL')
  const response = await new OpenAI({ apiKey, baseURL: baseUrl, timeout: timeoutMs, maxRetries: 0 }).chat.completions.create({
    model,
    messages: [{ role: 'system', content: system }, { role: 'user', content: original }],
    temperature,
    max_tokens: maxOutputTokens
  })
  return (response.choices[0]?.message.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

export const REWRITE_FNS: Record<AiProvider, RewriteFn> = { anthropic, openai, openrouter, compatible }

/** 自備金鑰可指定模型，沒指定就用該供應商的環境預設。 */
export function modelFor(provider: AiProvider, override?: string) {
  const { ai } = useRuntimeConfig()
  return override || { anthropic: ai.modelAnthropic, openai: ai.modelOpenai, openrouter: ai.modelOpenrouter, compatible: '' }[provider]
}

/** SDK 的逾時與額度錯誤各自對應不同的前端處置（重試 vs 導去設定金鑰），所以分開辨識。 */
export function classifyProviderError(err: unknown): RenditionResult['error'] {
  if (err instanceof Anthropic.APIConnectionTimeoutError || err instanceof OpenAI.APIConnectionTimeoutError) return 'timeout'
  if (err instanceof Anthropic.AuthenticationError || err instanceof OpenAI.AuthenticationError) return 'no_ai_credential'
  if (err instanceof Anthropic.RateLimitError || err instanceof OpenAI.RateLimitError) return 'no_ai_credential'
  return 'provider_error'
}
