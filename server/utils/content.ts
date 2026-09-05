import { eq } from 'drizzle-orm'
import { schema, useDb } from '../db'

export interface LoadedContent {
  id: string
  authorId: string
  originalText: string
  createdAt: Date
}

/** 訊息的作者欄位叫 senderId、也沒有 authorId，所以另外查，不放進這張表。 */
const TABLES = {
  post: schema.posts,
  comment: schema.comments
} as const

/** 三種內容都只需要「誰寫的、寫了什麼」，改寫服務與顯示原文共用這一支。 */
export async function loadContent(kind: ContentKind, id: string): Promise<LoadedContent | null> {
  if (kind === 'message') {
    const [row] = await useDb()
      .select({ id: schema.messages.id, authorId: schema.messages.senderId, originalText: schema.messages.originalText, createdAt: schema.messages.createdAt })
      .from(schema.messages)
      .where(eq(schema.messages.id, id))
      .limit(1)
    return row ?? null
  }
  const table = TABLES[kind]
  const [row] = await useDb()
    .select({ id: table.id, authorId: table.authorId, originalText: table.originalText, createdAt: table.createdAt })
    .from(table)
    .where(eq(table.id, id))
    .limit(1)
  return row ?? null
}

/** 訊息只有對話雙方看得到；貼文與留言全站可見。 */
export async function canView(kind: ContentKind, id: string, viewerId: string): Promise<boolean> {
  if (kind !== 'message') return true
  const [row] = await useDb()
    .select({ low: schema.conversations.userLowId, high: schema.conversations.userHighId })
    .from(schema.messages)
    .innerJoin(schema.conversations, eq(schema.conversations.id, schema.messages.conversationId))
    .where(eq(schema.messages.id, id))
    .limit(1)
  return !!row && (row.low === viewerId || row.high === viewerId)
}
