import { z } from 'zod'
import { readOwnCredential } from '../utils/ai/credentials'
import { ContentNotFoundError, renderContent } from '../utils/ai/render'
import { canView } from '../utils/content'
import { consumeRenderRateLimit } from '../utils/rateLimit'
import { requireUserId } from '../utils/session'
import { getCurrentUser } from '../utils/users'

const body = z.object({
  kind: z.enum(CONTENT_KINDS),
  id: z.uuid()
})

/** 改寫服務入口。語氣由 session 對應的讀者設定決定；自備金鑰由標頭帶入、只活在這個請求裡。 */
export default defineEventHandler(async (event): Promise<RenditionResult> => {
  const viewerId = requireUserId(event)
  if (!(await getCurrentUser(viewerId))) throw createError({ statusCode: 401, statusMessage: 'unauthorized' })
  if (!consumeRenderRateLimit(viewerId, 1)) throw createError({ statusCode: 429, statusMessage: 'rate_limited' })
  const { kind, id } = body.parse(await readBody(event))
  if (!(await canView(kind, id, viewerId))) throw createError({ statusCode: 404, statusMessage: 'content_not_found' })
  try {
    return await renderContent(kind, id, viewerId, readOwnCredential(event))
  } catch (err) {
    if (err instanceof ContentNotFoundError) throw createError({ statusCode: 404, statusMessage: err.code })
    throw err
  }
})
