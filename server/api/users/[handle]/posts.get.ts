import { z } from 'zod'
import { listPosts } from '../../../utils/posts'
import { requireUserId } from '../../../utils/session'
import { getUserByHandle } from '../../../utils/users'

const params = z.object({ handle: z.string().min(1) })
const query = z.object({ cursor: z.string().optional() })

export default defineEventHandler(async (event): Promise<Page<PostSummary>> => {
  const viewerId = requireUserId(event)
  const { handle } = params.parse(getRouterParams(event))
  const { cursor } = query.parse(getQuery(event))
  const user = await getUserByHandle(handle.toLowerCase())
  if (!user) throw createError({ statusCode: 404, statusMessage: 'user_not_found' })
  return listPosts(viewerId, { cursor, authorId: user.id })
})
