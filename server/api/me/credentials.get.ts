import { eq } from 'drizzle-orm'
import { schema, useDb } from '../../db'
import { requireUserId } from '../../utils/session'

export default defineEventHandler(async (event): Promise<CredentialSummary[]> => {
  const userId = requireUserId(event)
  const rows = await useDb()
    .select({ provider: schema.aiCredentials.provider, hint: schema.aiCredentials.hint, baseUrl: schema.aiCredentials.baseUrl, model: schema.aiCredentials.model })
    .from(schema.aiCredentials)
    .where(eq(schema.aiCredentials.userId, userId))
  return rows.filter((row): row is CredentialSummary => isAiProvider(row.provider))
})
