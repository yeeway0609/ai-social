import { z } from 'zod'
import { getConversationForViewer, listMessages } from '../../../utils/conversations'
import { requireUserId } from '../../../utils/session'

const params = z.object({ id: z.uuid() })
const query = z.object({ after: z.uuid().optional() })

export default defineEventHandler(async (event): Promise<MessageSummary[]> => {
  const viewerId = requireUserId(event)
  const { id } = params.parse(getRouterParams(event))
  const { after } = query.parse(getQuery(event))
  const conversation = await getConversationForViewer(id, viewerId)
  if (!conversation) throw createError({ statusCode: 404, statusMessage: 'conversation_not_found' })
  return listMessages(id, viewerId, after)
})
