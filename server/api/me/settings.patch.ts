import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../db'
import { requireUserId } from '../../utils/session'
import { getCurrentUser } from '../../utils/users'

const body = z.object({
  tone: z.enum(TONE_IDS),
  customInstruction: z.string().trim().max(MAX_CUSTOM_INSTRUCTION_LENGTH).nullable()
})

/** 引導設定與設定頁共用；第一次儲存即視為完成引導設定。 */
export default defineEventHandler(async (event): Promise<CurrentUser> => {
  const userId = requireUserId(event)
  const { tone, customInstruction } = body.parse(await readBody(event))

  // 自訂指示只給有自備金鑰的人：它的改寫不進共用快取，每次都燒讀者自己的額度
  if (customInstruction) {
    const hasOwnCredential = (await useDb().$count(schema.aiCredentials, eq(schema.aiCredentials.userId, userId))) > 0
    if (!hasOwnCredential) throw createError({ statusCode: 400, statusMessage: 'credential_required' })
  }

  await useDb()
    .update(schema.users)
    .set({
      tone,
      customInstruction: customInstruction || null,
      onboardedAt: new Date()
    })
    .where(eq(schema.users.id, userId))

  return (await getCurrentUser(userId))!
})
