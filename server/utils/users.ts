import { eq } from 'drizzle-orm'
import { schema, useDb } from '../db'

export const userSummaryColumns = {
  id: schema.users.id,
  handle: schema.users.handle,
  displayName: schema.users.displayName
}

export async function getCurrentUser(userId: string): Promise<CurrentUser | null> {
  const [row] = await useDb()
    .select({
      ...userSummaryColumns,
      tone: schema.users.tone,
      customInstruction: schema.users.customInstruction,
      onboardedAt: schema.users.onboardedAt
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)

  if (!row) return null
  return { ...row, onboardedAt: row.onboardedAt?.toISOString() ?? null }
}

export async function getUserByHandle(handle: string): Promise<UserSummary | null> {
  const [row] = await useDb()
    .select(userSummaryColumns)
    .from(schema.users)
    .where(eq(schema.users.handle, handle))
    .limit(1)
  return row ?? null
}
