import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const COOKIE = 'ai-social-session'

function sign(userId: string) {
  const secret = useRuntimeConfig().sessionSecret
  if (!secret) throw new Error('NUXT_SESSION_SECRET 未設定')
  return createHmac('sha256', secret).update(userId).digest('base64url')
}

export function setSession(event: H3Event, userId: string) {
  setCookie(event, COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: useRuntimeConfig().public.environment !== 'local',
    maxAge: 60 * 60 * 24 * 30,
    path: '/'
  })
}

/** 未登入回 null——匿名訪客也能瀏覽，只是改寫時只能吃團隊共用池。 */
export function getUserId(event: H3Event): string | null {
  const raw = getCookie(event, COOKIE)
  if (!raw) return null

  const separator = raw.lastIndexOf('.')
  if (separator < 0) return null

  const userId = raw.slice(0, separator)
  const provided = Buffer.from(raw.slice(separator + 1))
  const expected = Buffer.from(sign(userId))

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null
  return userId
}
