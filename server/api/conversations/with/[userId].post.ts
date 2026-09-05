import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../../db'
import { getOrCreateConversation } from '../../../utils/conversations'
import { requireUserId } from '../../../utils/session'

const params = z.object({ userId: z.uuid() })

export default defineEventHandler(async (event): Promise<{ conversationId: string }> => {
  const viewerId = await requireUserId(event)
  const { userId: otherId } = params.parse(getRouterParams(event))
  if (otherId === viewerId) throw createError({ statusCode: 400, statusMessage: 'cannot_chat_with_self' })

  const [other] = await useDb().select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, otherId)).limit(1)
  if (!other) throw createError({ statusCode: 404, statusMessage: 'user_not_found' })

  return { conversationId: await getOrCreateConversation(viewerId, otherId) }
})
