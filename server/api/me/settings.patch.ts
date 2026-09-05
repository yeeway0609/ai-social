import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../db'
import { requireUserId } from '../../utils/session'
import { getCurrentUser } from '../../utils/users'

const body = z.object({ tone: z.enum(TONE_IDS) })

/** 引導設定與設定頁共用；第一次儲存即視為完成引導設定。 */
export default defineEventHandler(async (event): Promise<CurrentUser> => {
  const userId = requireUserId(event)
  const { tone } = body.parse(await readBody(event))

  await useDb()
    .update(schema.users)
    .set({ tone, onboardedAt: new Date() })
    .where(eq(schema.users.id, userId))

  return (await getCurrentUser(userId))!
})
