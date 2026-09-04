import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../db'
import { setSession } from '../../utils/session'
import { getCurrentUser } from '../../utils/users'

const body = z.object({
  handle: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(100)
})

export default defineEventHandler(async (event): Promise<CurrentUser> => {
  const { handle, password } = body.parse(await readBody(event))

  const [row] = await useDb()
    .select({ id: schema.users.id, password: schema.users.password })
    .from(schema.users)
    .where(eq(schema.users.handle, handle.toLowerCase()))
    .limit(1)

  // handle 不存在與密碼錯誤回同一個錯誤碼，不讓人靠回應猜出哪些帳號存在
  if (!row || row.password !== password) {
    throw createError({ statusCode: 401, statusMessage: 'invalid_credentials' })
  }

  setSession(event, row.id)
  return (await getCurrentUser(row.id))!
})
