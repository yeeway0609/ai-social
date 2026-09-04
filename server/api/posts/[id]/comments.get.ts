import { z } from 'zod'
import { listComments } from '../../../utils/posts'
import { requireUserId } from '../../../utils/session'

const params = z.object({ id: z.uuid() })

export default defineEventHandler(async (event): Promise<CommentSummary[]> => {
  const viewerId = requireUserId(event)
  const { id } = params.parse(getRouterParams(event))
  return listComments(id, viewerId)
})
