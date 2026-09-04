import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../../db'
import { requireUserId } from '../../../utils/session'

const params = z.object({ provider: z.enum(AI_PROVIDERS) })

export default defineEventHandler(async (event) => {
  const userId = requireUserId(event)
  const { provider } = params.parse(getRouterParams(event))
  await useDb()
    .delete(schema.aiCredentials)
    .where(and(eq(schema.aiCredentials.userId, userId), eq(schema.aiCredentials.provider, provider)))
  return { ok: true }
})
