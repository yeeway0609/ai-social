import { and, eq, isNull, ne } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../db'
import { pregenerateRenditions } from '../../utils/ai/render'
import type { ResolvedCredential } from '../../utils/ai/credentials'
import { secretEquals } from '../../utils/crypto'

const body = z.object({
  /** 一次最多處理幾則內容；預產是逐則五個語氣，量大時分批跑避免撞函式時限。 */
  limit: z.number().int().min(1).max(200).default(50),
  /** 用這把金鑰產所有內容；不給就用共用池。金鑰只活在這個請求裡。 */
  provider: z.enum(AI_PROVIDERS).optional(),
  apiKey: z.string().trim().min(20).optional()
})

/**
 * demo 前一次灌好所有既有貼文與留言的預設語氣改寫，之後讀者都直接命中快取。
 * 用 x-admin-secret 標頭比對環境變數；沒設密鑰就整個端點不存在。
 * 只處理「還沒有任何一份改寫」的內容，所以可以重複執行直到回傳 0。
 */
export default defineEventHandler(async (event) => {
  const secret = useRuntimeConfig().adminSecret
  const provided = getHeader(event, 'x-admin-secret')
  if (!secret || !provided || !secretEquals(provided, secret)) {
    throw createError({ statusCode: 404, statusMessage: 'not_found' })
  }
  const { limit, provider, apiKey } = body.parse((await readBody(event).catch(() => null)) ?? {})
  const db = useDb()
  const credential: ResolvedCredential | null = provider && apiKey ? { provider, apiKey, source: 'own' } : null

  const pendingPosts = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .leftJoin(schema.renditions, and(eq(schema.renditions.kind, 'post'), eq(schema.renditions.contentId, schema.posts.id)))
    .where(isNull(schema.renditions.id))
    .limit(limit)
  const pendingComments = await db
    .select({ id: schema.comments.id })
    .from(schema.comments)
    .leftJoin(schema.renditions, and(eq(schema.renditions.kind, 'comment'), eq(schema.renditions.contentId, schema.comments.id)))
    .where(and(isNull(schema.renditions.id), ne(schema.comments.originalText, '')))
    .limit(Math.max(0, limit - pendingPosts.length))

  let generated = 0
  let failed = 0
  // 內容之間串行、每則內部五個語氣並行：兼顧速度與不把金鑰池打到 rate limit
  for (const post of pendingPosts) {
    const result = await pregenerateRenditions('post', post.id, credential)
    generated += result.generated
    failed += result.failed
  }
  for (const comment of pendingComments) {
    const result = await pregenerateRenditions('comment', comment.id, credential)
    generated += result.generated
    failed += result.failed
  }

  return { processedPosts: pendingPosts.length, processedComments: pendingComments.length, generated, failed }
})
