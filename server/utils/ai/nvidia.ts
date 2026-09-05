import OpenAI from 'openai'
import type { RenditionError } from '../../../shared/types/api'

export const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
// 一次要回所有語氣，上限按語氣數放大
const DEFAULT_MAX_OUTPUT_TOKENS = 4096

export class AiNotConfiguredError extends Error {}

/** 逗號分隔的多把金鑰加上單把的舊變數，去空白、去重；一把都沒有就是沒設定。 */
export function nvidiaApiKeys(): string[] {
  const { ai } = useRuntimeConfig()
  return [...new Set(`${ai.nvidiaApiKeys},${ai.nvidiaApiKey}`.split(',').map(key => key.trim()).filter(Boolean))]
}

/** 每個 serverless 實例各自從 0 開始輪替，不是全域公平，但足以把 RPM 壓力分散到每把金鑰。 */
let keyCursor = 0

/** 這把金鑰打到上限或失效，換下一把還有機會成功；其他錯誤換金鑰也沒用。 */
export function isKeyExhausted(err: unknown) {
  return err instanceof OpenAI.RateLimitError || err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.PermissionDeniedError
}

/**
 * 依序輪替金鑰執行 fn：從游標那把開始，碰到限流或失效就換下一把，全部都倒了才把最後的錯誤丟出去。
 * 成功時游標往前走一格，讓下一次請求換一把起手，四把金鑰等於四倍的每分鐘額度。
 */
export async function withNvidiaKey<T>(fn: (apiKey: string) => Promise<T>): Promise<T> {
  const keys = nvidiaApiKeys()
  if (keys.length === 0) throw new AiNotConfiguredError()
  let lastError: unknown
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const index = (keyCursor + attempt) % keys.length
    try {
      const result = await fn(keys[index]!)
      keyCursor = (index + 1) % keys.length
      return result
    } catch (err) {
      if (!isKeyExhausted(err)) throw err
      lastError = err
    }
  }
  throw lastError
}

/**
 * 改寫模型走 NVIDIA NIM 的 OpenAI 相容端點，金鑰只有伺服器持有。
 * Nemotron 預設會先思考再回答，改寫只要正文而且有時限，所以關掉思考；
 * 保險起見仍把殘留的 <think> 區段剝掉。限流交給金鑰輪替處理，SDK 自己不重試。
 */
export async function rewrite(args: { system: string, original: string, timeoutMs: number }): Promise<string> {
  const { ai } = useRuntimeConfig()
  const response = await withNvidiaKey(apiKey => new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL, timeout: args.timeoutMs, maxRetries: 0 })
    .chat.completions.create({
      model: ai.model,
      messages: [{ role: 'system', content: args.system }, { role: 'user', content: args.original }],
      temperature: ai.temperature,
      top_p: 0.95,
      max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
      stream: false,
      // chat_template_kwargs 是 NIM 專屬參數，OpenAI SDK 的型別沒有列，用斷言繞過多餘屬性檢查
      chat_template_kwargs: { enable_thinking: false }
    } as OpenAI.ChatCompletionCreateParamsNonStreaming))
  return (response.choices[0]?.message.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

/** 逾時與其他錯誤分開，金鑰沒設、全部失效或全部用完都歸「AI 暫時不可用」。 */
export function classifyRewriteError(err: unknown): RenditionError {
  if (err instanceof AiNotConfiguredError) return 'ai_unavailable'
  if (err instanceof OpenAI.APIConnectionTimeoutError) return 'timeout'
  if (isKeyExhausted(err)) return 'ai_unavailable'
  return 'model_error'
}
