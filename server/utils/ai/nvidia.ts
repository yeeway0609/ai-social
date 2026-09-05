import OpenAI from 'openai'
import type { RenditionError } from '../../../shared/types/api'

export const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const DEFAULT_MAX_OUTPUT_TOKENS = 1024

export class AiNotConfiguredError extends Error {}

/**
 * 改寫模型走 NVIDIA NIM 的 OpenAI 相容端點，金鑰只有伺服器持有。
 * Nemotron 預設會先思考再回答，改寫只要正文而且有時限，所以關掉思考；
 * 保險起見仍把殘留的 <think> 區段剝掉。
 */
export async function rewrite(args: { system: string, original: string, timeoutMs: number }): Promise<string> {
  const { ai } = useRuntimeConfig()
  if (!ai.nvidiaApiKey) throw new AiNotConfiguredError()
  const response = await new OpenAI({ apiKey: ai.nvidiaApiKey, baseURL: NVIDIA_BASE_URL, timeout: args.timeoutMs, maxRetries: 0 })
    .chat.completions.create({
      model: ai.model,
      messages: [{ role: 'system', content: args.system }, { role: 'user', content: args.original }],
      temperature: ai.temperature,
      top_p: 0.95,
      max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
      // @ts-expect-error NIM 專屬參數，OpenAI SDK 的型別沒有列
      chat_template_kwargs: { enable_thinking: false }
    })
  return (response.choices[0]?.message.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

/** 逾時與其他錯誤分開，金鑰沒設、失效或額度用完都歸「AI 暫時不可用」。 */
export function classifyProviderError(err: unknown): RenditionError {
  if (err instanceof AiNotConfiguredError) return 'ai_unavailable'
  if (err instanceof OpenAI.APIConnectionTimeoutError) return 'timeout'
  if (err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.RateLimitError) return 'ai_unavailable'
  return 'provider_error'
}
