import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../db'
import { deleteRenditions } from '../../utils/ai/render'
import { requireUserId } from '../../utils/session'

const params = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  const viewerId = requireUserId(event)
  const { id } = params.parse(getRouterParams(event))
  const deleted = await useDb()
    .delete(schema.comments)
    .where(and(eq(schema.comments.id, id), eq(schema.comments.authorId, viewerId)))
    .returning({ id: schema.comments.id })
  if (deleted.length === 0) throw createError({ statusCode: 404, statusMessage: 'comment_not_found' })
  await deleteRenditions('comment', id)
  return { ok: true }
})
