import { listConversations } from '../../utils/conversations'
import { requireUserId } from '../../utils/session'

export default defineEventHandler(async (event): Promise<ConversationSummary[]> => {
  return listConversations(requireUserId(event))
})
