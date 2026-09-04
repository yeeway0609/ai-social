import { and, eq, lt, or, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

/**
 * 游標＝「最後一筆的 createdAt｜id」。同一毫秒內多筆時只比 createdAt 會漏或重複，
 * 所以用 (createdAt, id) 複合比較。
 */
export function encodeCursor(createdAt: Date, id: string) {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url')
}

export function decodeCursor(cursor: string): { createdAt: Date, id: string } | null {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|')
  if (!iso || !id) return null
  const createdAt = new Date(iso)
  return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id }
}

export function beforeCursor(createdAtColumn: PgColumn, idColumn: PgColumn, cursor: string | undefined): SQL | undefined {
  if (!cursor) return undefined
  const decoded = decodeCursor(cursor)
  if (!decoded) throw createError({ statusCode: 400, statusMessage: 'invalid_cursor' })
  return or(
    lt(createdAtColumn, decoded.createdAt),
    and(eq(createdAtColumn, decoded.createdAt), lt(idColumn, decoded.id))
  )
}

export const PAGE_SIZE = 20
