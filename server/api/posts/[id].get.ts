import { z } from 'zod'
import { getPost } from '../../utils/posts'
import { requireUserId } from '../../utils/session'

const params = z.object({ id: z.uuid() })

export default defineEventHandler(async (event): Promise<PostSummary> => {
  const viewerId = requireUserId(event)
  const { id } = params.parse(getRouterParams(event))
  const post = await getPost(id, viewerId)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'post_not_found' })
  return post
})
