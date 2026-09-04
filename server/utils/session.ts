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

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, COOKIE, { path: '/' })
}

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

/** 未登入不能用 App，所有需要登入的端點都從這裡拿 userId。 */
export function requireUserId(event: H3Event): string {
  const userId = getUserId(event)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'unauthenticated' })
  return userId
}
