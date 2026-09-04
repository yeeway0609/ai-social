/**
 * 預建 demo 帳號。沒有註冊功能，加人或改密碼都靠這支重跑（以 handle 為鍵 upsert）。
 * 用法：pnpm db:seed（讀 scripts/seed-users.json，沒有就用 example 檔）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { users } from '../server/db/schema.ts'

interface SeedUser {
  handle: string
  displayName: string
  password: string
}

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL 未設定（用 node --env-file=.env 執行）')

const file = existsSync('scripts/seed-users.json') ? 'scripts/seed-users.json' : 'scripts/seed-users.example.json'
const seedUsers: SeedUser[] = JSON.parse(readFileSync(file, 'utf8'))

const db = drizzle(neon(url))
for (const user of seedUsers) {
  await db
    .insert(users)
    .values({ handle: user.handle.toLowerCase(), displayName: user.displayName, password: user.password })
    .onConflictDoUpdate({
      target: users.handle,
      set: { displayName: user.displayName, password: user.password }
    })
}
console.log(`已同步 ${seedUsers.length} 個帳號（來源：${file}）`)
