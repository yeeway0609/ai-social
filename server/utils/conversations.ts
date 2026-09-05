import { and, asc, desc, eq, gt, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import { schema, useDb } from '../db'
import { getViewer, renditionColumns, renditionJoin, toContentSummary, type Viewer } from './ai/render'
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

/** 每個對話最後一則訊息，一次查完；改寫在寫入時已預產，這裡只是 join 現成的結果。 */
async function fetchLastMessages(viewer: Viewer, conversationIds: string[]): Promise<Map<string, MessageSummary>> {
  if (conversationIds.length === 0) return new Map()
  const rows = await useDb()
    .selectDistinctOn([schema.messages.conversationId], {
      conversationId: schema.messages.conversationId,
      id: schema.messages.id,
      authorId: schema.messages.senderId,
      originalText: schema.messages.originalText,
      createdAt: schema.messages.createdAt,
      author: userSummaryColumns,
      ...renditionColumns
    })
    .from(schema.messages)
    .innerJoin(schema.users, eq(schema.users.id, schema.messages.senderId))
    .leftJoin(schema.renditions, renditionJoin('message', schema.messages.id, viewer.tone))
    .where(inArray(schema.messages.conversationId, conversationIds))
    .orderBy(schema.messages.conversationId, desc(schema.messages.createdAt), desc(schema.messages.id))

  return new Map(rows.map(row => [row.conversationId, { ...toContentSummary(row, viewer), conversationId: row.conversationId }]))
}

/**
 * 每個對話裡對方在讀者上次讀到之後送出的訊息數；沒有閱讀紀錄就整段都算未讀。
 * 自己送出的訊息不算，因為送出當下一定看得到。
 */
async function fetchUnreadCounts(viewerId: string, conversationIds: string[]): Promise<Map<string, number>> {
  if (conversationIds.length === 0) return new Map()
  const rows = await useDb()
    .select({
      conversationId: schema.messages.conversationId,
      unreadCount: sql<number>`count(*)::int`
    })
    .from(schema.messages)
    .leftJoin(schema.conversationReads, and(
      eq(schema.conversationReads.conversationId, schema.messages.conversationId),
      eq(schema.conversationReads.userId, viewerId)
    ))
    .where(and(
      inArray(schema.messages.conversationId, conversationIds),
      ne(schema.messages.senderId, viewerId),
      or(isNull(schema.conversationReads.lastReadAt), gt(schema.messages.createdAt, schema.conversationReads.lastReadAt))
    ))
    .groupBy(schema.messages.conversationId)
  return new Map(rows.map(row => [row.conversationId, row.unreadCount]))
}

/** 讀者開著對話頁時呼叫；同一列重複寫只是把時間往後推，沒有併發問題。 */
export async function markConversationRead(conversationId: string, viewerId: string) {
  const now = new Date()
  await useDb()
    .insert(schema.conversationReads)
    .values({ conversationId, userId: viewerId, lastReadAt: now })
    .onConflictDoUpdate({ target: [schema.conversationReads.conversationId, schema.conversationReads.userId], set: { lastReadAt: now } })
}

/** 每位其他使用者一列，不論聊過沒有；預覽用的最後一則訊息與未讀數另外各一次查完。 */
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

  const viewer = await getViewer(viewerId)
  const conversationIds = rows.flatMap(row => row.conversationId ? [row.conversationId] : [])
  const [lastMessages, unreadCounts] = await Promise.all([fetchLastMessages(viewer, conversationIds), fetchUnreadCounts(viewerId, conversationIds)])

  return rows.map(row => ({
    other: row.other,
    conversationId: row.conversationId,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    lastMessage: row.conversationId ? lastMessages.get(row.conversationId) ?? null : null,
    unreadCount: row.conversationId ? unreadCounts.get(row.conversationId) ?? 0 : 0
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

  const viewer = await getViewer(viewerId)
  const rows = await db
    .select({
      id: schema.messages.id,
      authorId: schema.messages.senderId,
      originalText: schema.messages.originalText,
      createdAt: schema.messages.createdAt,
      author: userSummaryColumns,
      ...renditionColumns
    })
    .from(schema.messages)
    .innerJoin(schema.users, eq(schema.users.id, schema.messages.senderId))
    .leftJoin(schema.renditions, renditionJoin('message', schema.messages.id, viewer.tone))
    .where(and(
      eq(schema.messages.conversationId, conversationId),
      afterCreatedAt && afterId
        ? or(gt(schema.messages.createdAt, afterCreatedAt), and(eq(schema.messages.createdAt, afterCreatedAt), gt(schema.messages.id, afterId)))
        : undefined
    ))
    .orderBy(asc(schema.messages.createdAt), asc(schema.messages.id))

  return rows.map(row => ({ ...toContentSummary(row, viewer), conversationId }))
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
    ...toContentSummary({ id: message!.id, authorId: senderId, originalText: text, createdAt: message!.createdAt, author: author! }, { id: senderId, tone: null }),
    conversationId
  }
}
