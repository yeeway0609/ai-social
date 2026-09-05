import { z } from 'zod'
import { listPosts } from '../../utils/posts'
import { requireUserId } from '../../utils/session'

const query = z.object({ cursor: z.string().optional() })

export default defineEventHandler(async (event): Promise<Page<PostSummary>> => {
  const viewerId = await requireUserId(event)
  const { cursor } = query.parse(getQuery(event))
  return listPosts(viewerId, { cursor })
})
