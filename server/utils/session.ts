import { createHmac } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { schema, useDb } from '../db'
import { secretEquals } from './crypto'

const COOKIE = 'butong-tone-session'

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
  if (!secretEquals(raw.slice(separator + 1), sign(userId))) return null
  return userId
}

/**
 * 未登入不能用 App，所有需要登入的端點都從這裡拿 userId。
 * cookie 簽章有效不代表帳號還在（demo 帳號會被清掉重建），所以每個請求查一次使用者存在；
 * 結果放在 event.context，同一請求多次呼叫只查一次。
 */
export async function requireUserId(event: H3Event): Promise<string> {
  if (typeof event.context.userId === 'string') return event.context.userId
  const userId = getUserId(event)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'unauthenticated' })
  const [user] = await useDb().select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, userId)).limit(1)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'unauthenticated' })
  event.context.userId = userId
  return userId
}
