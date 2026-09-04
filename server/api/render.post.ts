import { z } from 'zod'
import { ContentNotFoundError, renderContent } from '../utils/ai/render'
import { canView } from '../utils/content'
import { requireUserId } from '../utils/session'

const body = z.object({
  kind: z.enum(CONTENT_KINDS),
  id: z.uuid()
})

/** 改寫服務入口。語氣由 session 對應的讀者設定決定，前端不傳、也傳不進來。 */
export default defineEventHandler(async (event): Promise<RenditionResult> => {
  const viewerId = requireUserId(event)
  const { kind, id } = body.parse(await readBody(event))
  if (!(await canView(kind, id, viewerId))) throw createError({ statusCode: 404, statusMessage: 'content_not_found' })
  try {
    return await renderContent(kind, id, viewerId)
  } catch (err) {
    if (err instanceof ContentNotFoundError) throw createError({ statusCode: 404, statusMessage: err.code })
    throw err
  }
})
