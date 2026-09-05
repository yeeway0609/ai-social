/**
 * 預建 demo 帳號與示範內容。沒有註冊功能，加人或改密碼都靠這支重跑（以 username 為鍵 upsert）。
 * 貼文、留言、讚只在 posts 表為空時灌入，避免重跑時疊出重複內容；要重灌就先清空 posts。
 * 用法：pnpm db:seed（帳號讀 scripts/seed-users.json，沒有就用 example 檔；內容讀 scripts/seed-content.json）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'
import { count } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import { comments, likes, posts, users } from '../server/db/schema.ts'

interface SeedUser {
  username: string
  displayName: string
  password: string
}

interface SeedPost {
  username: string
  text: string
  comments?: Array<{ username: string, text: string }>
}

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL 未設定（用 node --env-file=.env 執行）')

const usersFile = existsSync('scripts/seed-users.json') ? 'scripts/seed-users.json' : 'scripts/seed-users.example.json'
const seedUsers: SeedUser[] = JSON.parse(readFileSync(usersFile, 'utf8'))
const seedPosts: SeedPost[] = JSON.parse(readFileSync('scripts/seed-content.json', 'utf8'))

const db = drizzle(neon(url))

const idByUsername = new Map<string, string>()
for (const user of seedUsers) {
  const username = user.username.toLowerCase()
  const [row] = await db
    .insert(users)
    .values({ username, displayName: user.displayName, password: user.password })
    .onConflictDoUpdate({
      target: users.username,
      set: { displayName: user.displayName, password: user.password }
    })
    .returning({ id: users.id })
  idByUsername.set(username, row!.id)
}
console.log(`已同步 ${seedUsers.length} 個帳號（來源：${usersFile}）`)

const [{ value: existingPosts }] = await db.select({ value: count() }).from(posts)
if (existingPosts > 0) {
  console.log(`posts 表已有 ${existingPosts} 則，略過示範內容`)
  process.exit(0)
}

function userId(username: string) {
  const id = idByUsername.get(username.toLowerCase())
  if (!id) throw new Error(`seed-content 用到不存在的帳號：${username}`)
  return id
}

// 固定種子的偽隨機，讓每次灌出來的讚分布一樣，demo 前後畫面可預期
let seed = 20260906
function random() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}

// 貼文時間往前散在 72 小時內，順序照檔案（越後面越新），feed 看起來像真的有人在用
const now = Date.now()
const spanMs = 72 * 60 * 60 * 1000
const usernames = [...idByUsername.keys()]
let likeTotal = 0
let commentTotal = 0

for (const [index, post] of seedPosts.entries()) {
  const createdAt = new Date(now - spanMs + (spanMs * (index + 1)) / (seedPosts.length + 1) + random() * 600_000)
  const authorId = userId(post.username)
  const [inserted] = await db
    .insert(posts)
    .values({ authorId, originalText: post.text, createdAt })
    .returning({ id: posts.id })
  const postId = inserted!.id

  const likerCount = Math.floor(random() * 8)
  const likers = usernames.filter(username => username !== post.username.toLowerCase()).sort(() => random() - 0.5).slice(0, likerCount)
  if (likers.length > 0) {
    await db.insert(likes).values(likers.map(username => ({ postId, userId: userId(username), createdAt: new Date(createdAt.getTime() + random() * 3_600_000) })))
    likeTotal += likers.length
  }

  for (const [commentIndex, comment] of (post.comments ?? []).entries()) {
    await db.insert(comments).values({
      postId,
      authorId: userId(comment.username),
      originalText: comment.text,
      createdAt: new Date(createdAt.getTime() + (commentIndex + 1) * 300_000 + random() * 300_000)
    })
    commentTotal++
  }
}

console.log(`已灌入 ${seedPosts.length} 則貼文、${commentTotal} 則留言、${likeTotal} 個讚`)
