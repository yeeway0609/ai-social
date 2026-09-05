import { z } from 'zod'
import { schedulePregeneration } from '../../../utils/ai/render'
import { getConversationForViewer, sendMessage } from '../../../utils/conversations'
import { requireUserId } from '../../../utils/session'

const params = z.object({ id: z.uuid() })
const body = z.object({ text: z.string().trim().min(1).max(MAX_TEXT_LENGTH) })

export default defineEventHandler(async (event): Promise<MessageSummary> => {
  const viewerId = await requireUserId(event)
  const { id } = params.parse(getRouterParams(event))
  const { text } = body.parse(await readBody(event))
  const conversation = await getConversationForViewer(id, viewerId)
  if (!conversation) throw createError({ statusCode: 404, statusMessage: 'conversation_not_found' })
  const message = await sendMessage(id, viewerId, text)
  schedulePregeneration(event, 'message', message.id)

  setResponseStatus(event, 201)
  return message
})
