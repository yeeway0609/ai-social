import { z } from 'zod'
import { getConversationForViewer, listMessages, markConversationRead } from '../../../utils/conversations'
import { requireUserId } from '../../../utils/session'

const params = z.object({ id: z.uuid() })
const query = z.object({ after: z.uuid().optional() })

export default defineEventHandler(async (event): Promise<MessageSummary[]> => {
  const viewerId = await requireUserId(event)
  const { id } = params.parse(getRouterParams(event))
  const { after } = query.parse(getQuery(event))
  const conversation = await getConversationForViewer(id, viewerId)
  if (!conversation) throw createError({ statusCode: 404, statusMessage: 'conversation_not_found' })
  // 對話頁開著才會來拉（含輪詢），拉到哪就讀到哪；不另開端點讓前端多打一次
  const [messages] = await Promise.all([listMessages(id, viewerId, after), markConversationRead(id, viewerId)])
  return messages
})
