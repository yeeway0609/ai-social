import { z } from 'zod'
import { schema, useDb } from '../../db'
import { seal } from '../../utils/crypto'
import { requireUserId } from '../../utils/session'

const body = z.object({
  provider: z.enum(AI_PROVIDERS),
  apiKey: z.string().trim().min(20).max(500)
})

export default defineEventHandler(async (event): Promise<CredentialSummary> => {
  const userId = requireUserId(event)
  const { provider, apiKey } = body.parse(await readBody(event))

  // 明文只在這個請求裡出現一次：存進去之後連讀出來的路徑都只有改寫服務會走。
  await useDb()
    .insert(schema.aiCredentials)
    .values({ userId, provider, encrypted: seal(apiKey), hint: apiKey.slice(-4) })
    .onConflictDoUpdate({
      target: [schema.aiCredentials.userId, schema.aiCredentials.provider],
      set: { encrypted: seal(apiKey), hint: apiKey.slice(-4) }
    })

  return { provider, hint: apiKey.slice(-4) }
})
