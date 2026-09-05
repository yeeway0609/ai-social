import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../../db'
import { schedulePregeneration } from '../../../utils/ai/render'
import { getConversationForViewer, sendMessage } from '../../../utils/conversations'
import { requireUserId } from '../../../utils/session'

const params = z.object({ id: z.uuid() })
const body = z.object({ text: z.string().trim().min(1).max(MAX_TEXT_LENGTH) })

export default defineEventHandler(async (event): Promise<MessageSummary> => {
  const viewerId = requireUserId(event)
  const { id } = params.parse(getRouterParams(event))
  const { text } = body.parse(await readBody(event))
  const conversation = await getConversationForViewer(id, viewerId)
  if (!conversation) throw createError({ statusCode: 404, statusMessage: 'conversation_not_found' })
  const message = await sendMessage(id, viewerId, text)

  // 訊息只預產收件人當下的語氣，不像貼文全部預產
  const recipientId = conversation.low === viewerId ? conversation.high : conversation.low
  const [recipient] = await useDb().select({ tone: schema.users.tone }).from(schema.users).where(eq(schema.users.id, recipientId)).limit(1)
  if (recipient?.tone) schedulePregeneration(event, 'message', message.id, [recipient.tone])

  setResponseStatus(event, 201)
  return message
})
