import type { H3Event } from 'h3'
import { OUTPUT_TOKENS_RANGE, TEMPERATURE_RANGE } from '#shared/utils/ai'

export interface ResolvedCredential extends ModelOptions {
  provider: AiProvider
  apiKey: string
  source: CredentialSource
}

const PROVIDER_HEADER = 'x-ai-provider'
const KEY_HEADER = 'x-ai-key'
const MODEL_HEADER = 'x-ai-model'
const TEMPERATURE_HEADER = 'x-ai-temperature'
const MAX_OUTPUT_TOKENS_HEADER = 'x-ai-max-output-tokens'

function numberHeader(event: H3Event, name: string, range: { min: number, max: number }, integer = false) {
  const raw = getHeader(event, name)
  if (!raw) return undefined
  const value = Number(raw)
  if (!Number.isFinite(value) || value < range.min || value > range.max) return undefined
  return integer ? Math.round(value) : value
}

/**
 * 使用者自備金鑰只存在他自己的瀏覽器，每次請求用標頭帶上來、用完即丟。
 * 伺服器不寫入資料庫、不寫 log，所以平台方拿不到、也無法代替使用者使用。
 */
export function readOwnCredential(event: H3Event): ResolvedCredential | null {
  const provider = getHeader(event, PROVIDER_HEADER)
  const apiKey = getHeader(event, KEY_HEADER)?.trim()
  if (!isAiProvider(provider) || !apiKey) return null
  const model = getHeader(event, MODEL_HEADER)?.trim().slice(0, MAX_MODEL_NAME_LENGTH) || undefined
  return {
    provider,
    apiKey,
    source: 'own',
    model,
    // 標頭值不合法就當沒填，退回預設，不讓一個壞參數擋掉整次改寫
    temperature: AI_PROVIDER_CAPABILITIES[provider].supportsTemperature ? numberHeader(event, TEMPERATURE_HEADER, TEMPERATURE_RANGE) : undefined,
    maxOutputTokens: numberHeader(event, MAX_OUTPUT_TOKENS_HEADER, OUTPUT_TOKENS_RANGE, true)
  }
}

/**
 * 團隊共用池以逗號分隔存在環境變數裡。每個 serverless 實例各自從 0 開始輪替，
 * 所以這不是全域的公平輪替，只是把單一把金鑰的壓力分散開——demo 規模夠用。
 */
let poolCursor = 0

function pool(provider: AiProvider): string[] {
  const { ai } = useRuntimeConfig()
  const raw = { anthropic: ai.poolAnthropic, openai: ai.poolOpenai, openrouter: ai.poolOpenrouter }[provider]
  return raw.split(',').map(k => k.trim()).filter(Boolean)
}

export function defaultProvider(): AiProvider {
  const { ai } = useRuntimeConfig()
  return isAiProvider(ai.defaultProvider) ? ai.defaultProvider : 'anthropic'
}

/**
 * 決定這次改寫要燒誰的額度：請求帶了自備金鑰就用它，否則動用環境預設供應商的共用池。
 * 池空不是系統錯誤——demo 現場共用池會被玩爆，要讓呼叫端有機會把使用者導去填自己的金鑰。
 */
export function resolveCredential(own: ResolvedCredential | null): ResolvedCredential | null {
  if (own) return own
  const provider = defaultProvider()
  const keys = pool(provider)
  if (keys.length === 0) return null
  return { provider, apiKey: keys[poolCursor++ % keys.length]!, source: 'pool' }
}
