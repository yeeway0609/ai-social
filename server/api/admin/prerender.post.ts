import { and, eq, isNull, ne } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../db'
import { pregenerateRenditions } from '../../utils/ai/render'

const body = z.object({
  /** 一次最多處理幾則內容；預產是逐則五個語氣，量大時分批跑避免撞函式時限。 */
  limit: z.number().int().min(1).max(200).default(50)
})

/**
 * demo 前一次灌好所有既有貼文與留言的預設語氣改寫，之後讀者都直接命中快取。
 * 用 x-admin-secret 標頭比對環境變數；沒設密鑰就整個端點不存在。
 * 只處理「還沒有任何一份改寫」的內容，所以可以重複執行直到回傳 0。
 */
export default defineEventHandler(async (event) => {
  const secret = useRuntimeConfig().adminSecret
  if (!secret || getHeader(event, 'x-admin-secret') !== secret) {
    throw createError({ statusCode: 404, statusMessage: 'not_found' })
  }
  const { limit } = body.parse((await readBody(event).catch(() => null)) ?? {})
  const db = useDb()

  const pendingPosts = await db
    .select({ id: schema.posts.id, authorId: schema.posts.authorId })
    .from(schema.posts)
    .leftJoin(schema.renditions, and(eq(schema.renditions.kind, 'post'), eq(schema.renditions.contentId, schema.posts.id)))
    .where(isNull(schema.renditions.id))
    .limit(limit)
  const pendingComments = await db
    .select({ id: schema.comments.id, authorId: schema.comments.authorId })
    .from(schema.comments)
    .leftJoin(schema.renditions, and(eq(schema.renditions.kind, 'comment'), eq(schema.renditions.contentId, schema.comments.id)))
    .where(and(isNull(schema.renditions.id), ne(schema.comments.originalText, '')))
    .limit(Math.max(0, limit - pendingPosts.length))

  let generated = 0
  let failed = 0
  // 內容之間串行、每則內部五個語氣並行：兼顧速度與不把金鑰池打到 rate limit
  for (const post of pendingPosts) {
    const result = await pregenerateRenditions('post', post.id, post.authorId)
    generated += result.generated
    failed += result.failed
  }
  for (const comment of pendingComments) {
    const result = await pregenerateRenditions('comment', comment.id, comment.authorId)
    generated += result.generated
    failed += result.failed
  }

  return { processedPosts: pendingPosts.length, processedComments: pendingComments.length, generated, failed }
})
