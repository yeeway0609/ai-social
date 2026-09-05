import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../db'
import { pregenerateRenditions } from '../../utils/ai/render'
import { secretEquals } from '../../utils/crypto'
import { TONES } from '../../../shared/utils/tones'

const body = z.object({
  /** 一次最多處理幾則內容；預產會補齊所有預設語氣，量大時分批跑避免撞函式時限。 */
  limit: z.number().int().min(1).max(200).default(50)
})

const CONTENT_TABLES = {
  post: schema.posts,
  comment: schema.comments,
  message: schema.messages
} as const

/** 每則內容 left join 它已有的改寫，一列一個語氣；一個語氣都沒有的內容 tone 為 null。 */
async function listContentIdsMissingAnyTone(kind: ContentKind, limit: number): Promise<string[]> {
  if (limit === 0) return []
  const table = CONTENT_TABLES[kind]
  const rows = await useDb()
    .select({ id: table.id, tone: schema.renditions.tone })
    .from(table)
    .leftJoin(schema.renditions, and(eq(schema.renditions.kind, kind), eq(schema.renditions.contentId, table.id)))

  const toneIdsByContent = new Map<string, Set<string>>()
  for (const row of rows) {
    const toneIds = toneIdsByContent.get(row.id) ?? new Set<string>()
    if (row.tone) toneIds.add(row.tone)
    toneIdsByContent.set(row.id, toneIds)
  }
  return [...toneIdsByContent]
    .filter(([, toneIds]) => TONES.some(tone => !toneIds.has(tone.id)))
    .slice(0, limit)
    .map(([id]) => id)
}

/**
 * demo 前一次灌好所有既有內容的預設語氣改寫，之後讀者都直接命中快取；
 * 訊息平時只預產收件人當下的語氣，這裡一律補齊全部語氣，換語氣後的對話才不會退回原文。
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

  const processed: Record<ContentKind, number> = { post: 0, comment: 0, message: 0 }
  let generated = 0
  let failed = 0
  let skipped = 0
  let remaining = limit
  for (const kind of CONTENT_KINDS) {
    const ids = await listContentIdsMissingAnyTone(kind, remaining)
    processed[kind] = ids.length
    remaining -= ids.length
    // 內容之間串行、每則內部預設語氣並行：兼顧速度與不撞 NIM 的 rate limit
    for (const id of ids) {
      const result = await pregenerateRenditions(kind, id)
      generated += result.generated
      failed += result.failed
      skipped += result.skipped
    }
  }

  return { processedPosts: processed.post, processedComments: processed.comment, processedMessages: processed.message, generated, failed, skipped }
})
