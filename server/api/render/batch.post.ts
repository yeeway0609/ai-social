import { z } from 'zod'
import { readOwnCredential } from '../../utils/ai/credentials'
import { ContentNotFoundError, renderContentBatch } from '../../utils/ai/render'
import { canView } from '../../utils/content'
import { consumeRenderRateLimit } from '../../utils/rateLimit'
import { requireUserId } from '../../utils/session'
import { getCurrentUser } from '../../utils/users'
import { MAX_RENDER_BATCH_COUNT, parseRenderBatchRequest, RenderContractError } from '../../../shared/utils/renderContract'

const item = z.object({
  kind: z.enum(CONTENT_KINDS),
  id: z.uuid()
}).strict()

const body = z.object({
  items: z.array(item).min(1).max(MAX_RENDER_BATCH_COUNT)
}).strict()

/** 批次改寫入口；前端只送內容識別，語氣與正式原文都由服務端讀取。 */
export default defineEventHandler(async (event): Promise<RenderBatchResult> => {
  const viewerId = requireUserId(event)
  if (!(await getCurrentUser(viewerId))) throw createError({ statusCode: 401, statusMessage: 'unauthorized' })

  let request: RenderBatchRequest
  try {
    request = parseRenderBatchRequest(body.parse(await readBody(event)))
  } catch (err) {
    if (err instanceof RenderContractError || err instanceof z.ZodError) {
      throw createError({ statusCode: 400, statusMessage: 'invalid_render_request' })
    }
    throw err
  }

  if (!consumeRenderRateLimit(viewerId, request.items.length)) {
    throw createError({ statusCode: 429, statusMessage: 'rate_limited' })
  }

  const allowed = await Promise.all(request.items.map(entry => canView(entry.kind, entry.id, viewerId)))
  if (allowed.some(value => !value)) throw createError({ statusCode: 404, statusMessage: 'content_not_found' })

  try {
    return await renderContentBatch(request, viewerId, readOwnCredential(event))
  } catch (err) {
    if (err instanceof ContentNotFoundError) throw createError({ statusCode: 404, statusMessage: err.code })
    throw err
  }
})
