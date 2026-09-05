import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../../db'
import { schedulePregeneration, toContentSummary } from '../../../utils/ai/render'
import { requireUserId } from '../../../utils/session'
import { userSummaryColumns } from '../../../utils/users'

const params = z.object({ id: z.uuid() })
const body = z.object({ text: z.string().trim().min(1).max(MAX_TEXT_LENGTH) })

export default defineEventHandler(async (event): Promise<CommentSummary> => {
  const authorId = await requireUserId(event)
  const { id: postId } = params.parse(getRouterParams(event))
  const { text } = body.parse(await readBody(event))
  const db = useDb()

  const [post] = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.id, postId)).limit(1)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'post_not_found' })

  const [comment] = await db
    .insert(schema.comments)
    .values({ postId, authorId, originalText: text })
    .returning({ id: schema.comments.id, createdAt: schema.comments.createdAt })
  const [author] = await db.select(userSummaryColumns).from(schema.users).where(eq(schema.users.id, authorId)).limit(1)

  schedulePregeneration(event, 'comment', comment!.id)
  setResponseStatus(event, 201)
  return toContentSummary({ id: comment!.id, authorId, originalText: text, createdAt: comment!.createdAt, author: author! }, { id: authorId, tone: null })
})
