import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let cached: ReturnType<typeof drizzle<typeof schema>> | undefined

/**
 * Neon 的 HTTP driver 每次查詢是一個獨立請求，沒有連線池要管，
 * 所以 serverless 冷啟不需要暖機、也不必在 lifespan 收尾。
 */
export function useDb() {
  if (!cached) {
    // 不走 runtimeConfig：DATABASE_URL 由 Vercel 的 Neon 整合自動注入，
    // 換成 NUXT_ 前綴等於要自己維護一份會過期的複本。
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL 未設定')
    cached = drizzle(neon(url), { schema })
  }
  return cached
}

export { schema }
