import { eq } from 'drizzle-orm'
import { schema, useDb } from '../db'

export const userSummaryColumns = {
  id: schema.users.id,
  username: schema.users.username,
  displayName: schema.users.displayName
}

export async function getCurrentUser(userId: string): Promise<CurrentUser | null> {
  const [row] = await useDb()
    .select({
      ...userSummaryColumns,
      tone: schema.users.tone,
      onboardedAt: schema.users.onboardedAt
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)

  if (!row) return null
  return { ...row, onboardedAt: row.onboardedAt?.toISOString() ?? null }
}

export async function getUserByUsername(username: string): Promise<UserSummary | null> {
  const [row] = await useDb()
    .select(userSummaryColumns)
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1)
  return row ?? null
}
