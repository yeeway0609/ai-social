import { and, asc, eq, gt, ne, or, sql } from 'drizzle-orm'
import { schema, useDb } from '../db'
import { userSummaryColumns } from './users'

function orderPair(a: string, b: string) {
  return a < b ? { userLowId: a, userHighId: b } : { userLowId: b, userHighId: a }
}

/** 兩人的對話不存在就建立；唯一鍵保證併發下也只會有一筆。 */
export async function getOrCreateConversation(viewerId: string, otherId: string): Promise<string> {
  const db = useDb()
  const pair = orderPair(viewerId, otherId)
  const [inserted] = await db
    .insert(schema.conversations)
    .values(pair)
    .onConflictDoNothing()
    .returning({ id: schema.conversations.id })
  if (inserted) return inserted.id

  const [existing] = await db
    .select({ id: schema.conversations.id })
    .from(schema.conversations)
    .where(and(eq(schema.conversations.userLowId, pair.userLowId), eq(schema.conversations.userHighId, pair.userHighId)))
    .limit(1)
  return existing!.id
}

export async function getConversationForViewer(conversationId: string, viewerId: string) {
  const [row] = await useDb()
    .select({ id: schema.conversations.id, low: schema.conversations.userLowId, high: schema.conversations.userHighId })
    .from(schema.conversations)
    .where(and(
      eq(schema.conversations.id, conversationId),
      or(eq(schema.conversations.userLowId, viewerId), eq(schema.conversations.userHighId, viewerId))
    ))
    .limit(1)
  return row ?? null
}

/** 每位其他使用者一列，不論聊過沒有；列表不帶訊息內容，所以不觸發改寫。 */
export async function listConversations(viewerId: string): Promise<ConversationSummary[]> {
  const rows = await useDb()
    .select({
      other: userSummaryColumns,
      conversationId: schema.conversations.id,
      lastMessageAt: schema.conversations.lastMessageAt
    })
    .from(schema.users)
    .leftJoin(schema.conversations, or(
      and(eq(schema.conversations.userLowId, viewerId), eq(schema.conversations.userHighId, schema.users.id)),
      and(eq(schema.conversations.userHighId, viewerId), eq(schema.conversations.userLowId, schema.users.id))
    ))
    .where(ne(schema.users.id, viewerId))
    .orderBy(sql`${schema.conversations.lastMessageAt} desc nulls last`, schema.users.displayName)

  return rows.map(row => ({
    other: row.other,
    conversationId: row.conversationId,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null
  }))
}

/** 以最後一則訊息 id 為游標往後拉；沒有游標就給整段歷史。 */
export async function listMessages(conversationId: string, viewerId: string, afterId?: string): Promise<MessageSummary[]> {
  const db = useDb()
  let afterCreatedAt: Date | undefined
  if (afterId) {
    const [anchor] = await db
      .select({ createdAt: schema.messages.createdAt })
      .from(schema.messages)
      .where(and(eq(schema.messages.id, afterId), eq(schema.messages.conversationId, conversationId)))
      .limit(1)
    afterCreatedAt = anchor?.createdAt
  }

  const rows = await db
    .select({
      id: schema.messages.id,
      senderId: schema.messages.senderId,
      originalText: schema.messages.originalText,
      createdAt: schema.messages.createdAt,
      author: userSummaryColumns
    })
    .from(schema.messages)
    .innerJoin(schema.users, eq(schema.users.id, schema.messages.senderId))
    .where(and(
      eq(schema.messages.conversationId, conversationId),
      afterCreatedAt && afterId
        ? or(gt(schema.messages.createdAt, afterCreatedAt), and(eq(schema.messages.createdAt, afterCreatedAt), gt(schema.messages.id, afterId)))
        : undefined
    ))
    .orderBy(asc(schema.messages.createdAt), asc(schema.messages.id))

  return rows.map((row) => {
    const isOwn = row.senderId === viewerId
    return {
      id: row.id,
      conversationId,
      author: row.author,
      originalText: isOwn ? row.originalText : null,
      isOwn,
      createdAt: row.createdAt.toISOString()
    }
  })
}

export async function sendMessage(conversationId: string, senderId: string, text: string): Promise<MessageSummary> {
  const db = useDb()
  const [message] = await db
    .insert(schema.messages)
    .values({ conversationId, senderId, originalText: text })
    .returning({ id: schema.messages.id, createdAt: schema.messages.createdAt })
  await db
    .update(schema.conversations)
    .set({ lastMessageAt: message!.createdAt })
    .where(eq(schema.conversations.id, conversationId))
  const [author] = await db.select(userSummaryColumns).from(schema.users).where(eq(schema.users.id, senderId)).limit(1)
  return {
    id: message!.id,
    conversationId,
    author: author!,
    originalText: text,
    isOwn: true,
    createdAt: message!.createdAt.toISOString()
  }
}
