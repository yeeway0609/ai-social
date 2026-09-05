import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../db'
import { deleteRenditions } from '../../utils/ai/render'
import { requireUserId } from '../../utils/session'

const params = z.object({ id: z.uuid() })

/** 硬刪除；留言與讚靠外鍵 cascade 一起消失。 */
export default defineEventHandler(async (event) => {
  const viewerId = requireUserId(event)
  const { id } = params.parse(getRouterParams(event))
  const deleted = await useDb()
    .delete(schema.posts)
    .where(and(eq(schema.posts.id, id), eq(schema.posts.authorId, viewerId)))
    .returning({ id: schema.posts.id })
  if (deleted.length === 0) throw createError({ statusCode: 404, statusMessage: 'post_not_found' })
  // 留言的改寫留著也無害（沒人查得到），只清貼文自己的
  await deleteRenditions('post', id)
  return { ok: true }
})
