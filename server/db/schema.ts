import { index, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

/**
 * 帳號由團隊預建，沒有註冊；password 是 demo 用的明文短碼，服務 demo 後即關閉。
 * tone 為 null 等同尚未完成引導設定（onboardedAt 也會是 null）。
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  handle: text('handle').notNull(),
  displayName: text('display_name').notNull(),
  password: text('password').notNull(),
  tone: text('tone'),
  customInstruction: text('custom_instruction'),
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [uniqueIndex('users_handle_key').on(table.handle)])

/**
 * 使用者自備的模型金鑰。demo 現場團隊共用池會被玩爆，自備金鑰是耗盡後唯一的續命路徑，
 * 所以它是常態功能而非後備選項。
 * 金鑰以 AES-256-GCM 加密後存 encrypted，明文永不落地、也永不回傳前端。
 */
export const aiCredentials = pgTable('ai_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  encrypted: jsonb('encrypted').notNull(),
  // 給使用者辨識用的尾四碼，例如 ...4f2a
  hint: text('hint').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [uniqueIndex('ai_credentials_user_provider_key').on(table.userId, table.provider)])

/** 只存原文；改寫是衍生資料，不進資料庫。 */
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
 * 改寫快取。預設語氣的改寫全站共用（同語氣所有讀者看到同一份），
 * 帶自訂指示的改寫以指示的雜湊區分，只有寫了一樣指示的人會命中。
 * 內容被刪時改寫沒有外鍵可 cascade（kind 不同表），由刪除端點順手清。
 */
export const renditions = pgTable('renditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),
  contentId: uuid('content_id').notNull(),
  tone: text('tone').notNull(),
  // 預設語氣為空字串；自訂指示存 sha256，讓唯一索引能涵蓋兩種情況
  instructionHash: text('instruction_hash').notNull().default(''),
  text: text('text').notNull(),
  scale: text('scale').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [uniqueIndex('renditions_key').on(table.kind, table.contentId, table.tone, table.instructionHash)])
