import { z } from 'zod'
import { canView, loadContent } from '../utils/content'
import { requireUserId } from '../utils/session'

const query = z.object({
  kind: z.enum(CONTENT_KINDS),
  id: z.uuid()
})

/** 「顯示原文」專用；與改寫服務分開，這條路永遠不碰模型。 */
export default defineEventHandler(async (event): Promise<OriginalResult> => {
  const viewerId = await requireUserId(event)
  const { kind, id } = query.parse(getQuery(event))
  if (!(await canView(kind, id, viewerId))) throw createError({ statusCode: 404, statusMessage: 'content_not_found' })
  const content = await loadContent(kind, id)
  if (!content) throw createError({ statusCode: 404, statusMessage: 'content_not_found' })
  return { kind, id, text: content.originalText }
})
