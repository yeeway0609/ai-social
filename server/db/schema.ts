import { index, pgTable, primaryKey, real, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

/**
 * 帳號由團隊預建，沒有註冊；password 是 demo 用的明文短碼，服務 demo 後即關閉。
 * tone 為 null 等同尚未完成引導設定（onboardedAt 也會是 null）。
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull(),
  displayName: text('display_name').notNull(),
  password: text('password').notNull(),
  tone: text('tone'),
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [uniqueIndex('users_username_key').on(table.username)])

/** 只存原文；改寫存在 renditions，永不回寫這裡。 */
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  originalText: text('original_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [index('posts_created_at_idx').on(table.createdAt, table.id)])

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  originalText: text('original_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [index('comments_post_idx').on(table.postId, table.createdAt)])

export const likes = pgTable('likes', {
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [primaryKey({ columns: [table.postId, table.userId] })])

/**
 * 每對使用者只有一個對話。兩個參與者依 id 字串序存成 userLowId < userHighId，
 * 這樣「A 找 B」與「B 找 A」算出同一把唯一鍵，get-or-create 不會撞出兩筆。
 */
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userLowId: uuid('user_low_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userHighId: uuid('user_high_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [uniqueIndex('conversations_pair_key').on(table.userLowId, table.userHighId)])

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  originalText: text('original_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [index('messages_conversation_idx').on(table.conversationId, table.createdAt, table.id)])

/**
 * 每則內容在每個語氣下的改寫，寫入時預產、讀取時直接撈；同語氣所有讀者看到同一份。
 * 內容被刪時改寫沒有外鍵可 cascade（kind 不同表），由刪除端點順手清。
 */
export const renditions = pgTable('renditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),
  contentId: uuid('content_id').notNull(),
  tone: text('tone').notNull(),
  text: text('text').notNull(),
  scale: text('scale').notNull(),
  semanticSimilarityScore: real('semantic_similarity_score'),
  semanticSimilarityModel: text('semantic_similarity_model'),
  semanticSimilarityVersion: text('semantic_similarity_version'),
  semanticSimilarityError: text('semantic_similarity_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [uniqueIndex('renditions_key').on(table.kind, table.contentId, table.tone)])
