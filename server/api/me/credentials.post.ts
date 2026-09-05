import { z } from 'zod'
import { schema, useDb } from '../../db'
import { seal } from '../../utils/crypto'
import { requireUserId } from '../../utils/session'

const body = z.object({
  provider: z.enum(AI_PROVIDERS),
  apiKey: z.string().trim().min(8).max(500),
  baseUrl: z.url().optional(),
  model: z.string().trim().min(1).max(200).optional()
}).refine(value => value.provider !== 'local' || (value.baseUrl && value.model), {
  message: '地端模型必須填 base URL 與模型名稱'
})

export default defineEventHandler(async (event): Promise<CredentialSummary> => {
  const userId = requireUserId(event)
  const { provider, apiKey, baseUrl, model } = body.parse(await readBody(event))
  // 端點與模型只對自架模型有意義，其他供應商即使送了也不存
  const extra = provider === 'local' ? { baseUrl: baseUrl!, model: model! } : { baseUrl: null, model: null }

  // 明文只在這個請求裡出現一次：存進去之後連讀出來的路徑都只有改寫服務會走。
  await useDb()
    .insert(schema.aiCredentials)
    .values({ userId, provider, encrypted: seal(apiKey), hint: apiKey.slice(-4), ...extra })
    .onConflictDoUpdate({
      target: [schema.aiCredentials.userId, schema.aiCredentials.provider],
      set: { encrypted: seal(apiKey), hint: apiKey.slice(-4), ...extra }
    })

  return { provider, hint: apiKey.slice(-4), ...extra }
})
