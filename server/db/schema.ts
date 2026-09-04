import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  handle: text('handle').notNull(),
  displayName: text('display_name').notNull(),
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
