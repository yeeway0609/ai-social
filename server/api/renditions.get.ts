import { z } from 'zod'
import { getViewer, isRenditionPending, lookupStoredRendition } from '../utils/ai/render'
import { canView, loadContent } from '../utils/content'
import { requireUserId } from '../utils/session'

const query = z.object({
  kind: z.enum(CONTENT_KINDS),
  id: z.uuid()
})

/** 列表回來時改寫還在預產中，前端用這支輪詢；只查資料庫，永遠不碰模型。 */
export default defineEventHandler(async (event): Promise<RenditionLookup> => {
  const viewerId = await requireUserId(event)
  const { kind, id } = query.parse(getQuery(event))
  if (!(await canView(kind, id, viewerId))) throw createError({ statusCode: 404, statusMessage: 'content_not_found' })
  const content = await loadContent(kind, id)
  if (!content) throw createError({ statusCode: 404, statusMessage: 'content_not_found' })

  const { tone } = await getViewer(viewerId)
  const stored = tone && content.authorId !== viewerId
    ? await lookupStoredRendition(kind, id, tone)
    : { rendition: null, isUnchanged: false }
  const isPending = !!tone && content.authorId !== viewerId && !stored.isUnchanged && isRenditionPending(stored.rendition, content.createdAt)
  return { kind, id, rendition: stored.rendition, isPending, originalText: stored.rendition || isPending ? null : content.originalText }
})
