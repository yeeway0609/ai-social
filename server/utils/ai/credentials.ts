import { and, eq } from 'drizzle-orm'
import { schema, useDb } from '../../db'
import { unseal, type SealedSecret } from '../crypto'

/** 池與自備金鑰都沒有時丟這個，讓呼叫端把使用者導去 onboarding 設定自己的金鑰。 */
export class NoCredentialError extends Error {
  readonly code = 'no_ai_credential'
  constructor(readonly provider: AiProvider) {
    super(`${provider} 沒有可用的金鑰`)
  }
}

export interface ResolvedCredential {
  provider: AiProvider
  apiKey: string
  source: CredentialSource
}

/**
 * 團隊共用池以逗號分隔存在環境變數裡。每個 serverless 實例各自從 0 開始輪替，
 * 所以這不是全域的公平輪替，只是把單一把金鑰的壓力分散開——demo 規模夠用。
 */
let poolCursor = 0

function pool(provider: AiProvider): string[] {
  const { ai } = useRuntimeConfig()
  const raw = { anthropic: ai.poolAnthropic, openai: ai.poolOpenai, openrouter: ai.poolOpenrouter, local: ai.poolLocal }[provider]
  return raw.split(',').map(k => k.trim()).filter(Boolean)
}

/**
 * 決定這次改寫要燒誰的額度：使用者自備優先，其次才動用團隊共用池。
 *
 * 兩條路都是常態路徑——demo 現場共用池會被玩爆，耗盡後自備金鑰是唯一續命方式，
 * 所以池空不是系統錯誤，要讓呼叫端有機會把使用者導去 onboarding 設定自己的金鑰。
 */
export async function resolveCredential(
  userId: string | null,
  provider: AiProvider
): Promise<ResolvedCredential | null> {
  if (userId) {
    const [row] = await useDb()
      .select({ encrypted: schema.aiCredentials.encrypted })
      .from(schema.aiCredentials)
      .where(and(
        eq(schema.aiCredentials.userId, userId),
        eq(schema.aiCredentials.provider, provider)
      ))
      .limit(1)

    if (row) {
      return { provider, apiKey: unseal(row.encrypted as SealedSecret), source: 'own' }
    }
  }

  const keys = pool(provider)
  if (keys.length === 0) return null

  const apiKey = keys[poolCursor++ % keys.length]!
  return { provider, apiKey, source: 'pool' }
}
