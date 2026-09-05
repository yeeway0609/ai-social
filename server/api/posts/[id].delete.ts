import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../db'
import { deleteRenditions } from '../../utils/ai/render'
import { requireUserId } from '../../utils/session'

const params = z.object({ id: z.uuid() })

/** 硬刪除；留言與讚靠外鍵 cascade 一起消失，改寫沒有外鍵，貼文與留言的都要自己清。 */
export default defineEventHandler(async (event) => {
  const viewerId = await requireUserId(event)
  const { id } = params.parse(getRouterParams(event))
  const db = useDb()
  // 留言 id 要在 cascade 刪掉前先拿到，否則找不到該清哪些改寫
  const comments = await db.select({ id: schema.comments.id }).from(schema.comments).where(eq(schema.comments.postId, id))
  const deleted = await db
    .delete(schema.posts)
    .where(and(eq(schema.posts.id, id), eq(schema.posts.authorId, viewerId)))
    .returning({ id: schema.posts.id })
  if (deleted.length === 0) throw createError({ statusCode: 404, statusMessage: 'post_not_found' })
  await Promise.all([deleteRenditions('post', id), ...comments.map(comment => deleteRenditions('comment', comment.id))])
  return { ok: true }
})
