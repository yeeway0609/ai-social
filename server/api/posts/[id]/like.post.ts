import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../../db'
import { requireUserId } from '../../../utils/session'

const params = z.object({ id: z.uuid() })

/** 切換讚：有就收回、沒有就加；複合主鍵擋掉重複點擊造成的重複累加。 */
export default defineEventHandler(async (event): Promise<LikeResult> => {
  const userId = requireUserId(event)
  const { id: postId } = params.parse(getRouterParams(event))
  const db = useDb()

  const removed = await db
    .delete(schema.likes)
    .where(and(eq(schema.likes.postId, postId), eq(schema.likes.userId, userId)))
    .returning({ postId: schema.likes.postId })

  let isLiked = false
  if (removed.length === 0) {
    const inserted = await db
      .insert(schema.likes)
      .values({ postId, userId })
      .onConflictDoNothing()
      .returning({ postId: schema.likes.postId })
    if (inserted.length === 0) throw createError({ statusCode: 404, statusMessage: 'post_not_found' })
    isLiked = true
  }

  const likeCount = await db.$count(schema.likes, eq(schema.likes.postId, postId))
  return { isLiked, likeCount }
})
