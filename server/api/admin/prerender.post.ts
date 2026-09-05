import { and, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../db'
import { readOwnCredential } from '../../utils/ai/credentials'
import { pregenerateRenditions } from '../../utils/ai/render'
import { secretEquals } from '../../utils/crypto'
import { TONES } from '../../../shared/utils/tones'

const body = z.object({
  /** 一次最多處理幾則內容；預產會補齊所有預設語氣，量大時分批跑避免撞函式時限。 */
  limit: z.number().int().min(1).max(200).default(50)
})

type ContentRenditionRow = {
  id: string
  authorId: string
  tone: string | null
}

function selectContentMissingAnyTone(rows: ContentRenditionRow[], limit: number) {
  const requiredToneIds = new Set(TONES.map(tone => tone.id))
  const grouped = new Map<string, { id: string, authorId: string, toneIds: Set<string> }>()

  for (const row of rows) {
    const item = grouped.get(row.id) ?? { id: row.id, authorId: row.authorId, toneIds: new Set<string>() }
    if (row.tone && requiredToneIds.has(row.tone)) item.toneIds.add(row.tone)
    grouped.set(row.id, item)
  }

  return Array.from(grouped.values())
    .filter(item => item.toneIds.size < requiredToneIds.size)
    .slice(0, limit)
    .map(({ id, authorId }) => ({ id, authorId }))
}

/**
 * demo 前一次灌好所有既有貼文與留言的預設語氣改寫，之後讀者都直接命中快取。
 * 用 x-admin-secret 標頭比對環境變數；沒設密鑰就整個端點不存在。
 * 只處理缺少至少一個預設語氣的內容，所以可以重複執行直到回傳 0。
 */
export default defineEventHandler(async (event) => {
  const secret = useRuntimeConfig().adminSecret
  const provided = getHeader(event, 'x-admin-secret')
  if (!secret || !provided || !secretEquals(provided, secret)) {
    throw createError({ statusCode: 404, statusMessage: 'not_found' })
  }
  const { limit } = body.parse((await readBody(event).catch(() => null)) ?? {})
  const db = useDb()
  const ownCredential = readOwnCredential(event)

  const postRows = await db
    .select({ id: schema.posts.id, authorId: schema.posts.authorId, tone: schema.renditions.tone })
    .from(schema.posts)
    .leftJoin(schema.renditions, and(eq(schema.renditions.kind, 'post'), eq(schema.renditions.contentId, schema.posts.id)))
  const pendingPosts = selectContentMissingAnyTone(postRows, limit)

  const commentRows = await db
    .select({ id: schema.comments.id, authorId: schema.comments.authorId, tone: schema.renditions.tone })
    .from(schema.comments)
    .leftJoin(schema.renditions, and(eq(schema.renditions.kind, 'comment'), eq(schema.renditions.contentId, schema.comments.id)))
    .where(ne(schema.comments.originalText, ''))
  const pendingComments = selectContentMissingAnyTone(commentRows, Math.max(0, limit - pendingPosts.length))

  let generated = 0
  let failed = 0
  // 內容之間串行、每則內部預設語氣並行：兼顧速度與不把金鑰池打到 rate limit
  for (const post of pendingPosts) {
    const result = await pregenerateRenditions('post', post.id, ownCredential)
    generated += result.generated
    failed += result.failed
  }
  for (const comment of pendingComments) {
    const result = await pregenerateRenditions('comment', comment.id, ownCredential)
    generated += result.generated
    failed += result.failed
  }

  return { processedPosts: pendingPosts.length, processedComments: pendingComments.length, generated, failed }
})
