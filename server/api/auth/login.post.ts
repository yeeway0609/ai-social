import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../db'
import { secretEquals } from '../../utils/crypto'
import { setSession } from '../../utils/session'
import { getCurrentUser } from '../../utils/users'

const body = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(100)
})

export default defineEventHandler(async (event): Promise<CurrentUser> => {
  const { username, password } = body.parse(await readBody(event))

  const [row] = await useDb()
    .select({ id: schema.users.id, password: schema.users.password })
    .from(schema.users)
    .where(eq(schema.users.username, username.toLowerCase()))
    .limit(1)

  // username 不存在與密碼錯誤回同一個錯誤碼，不讓人靠回應猜出哪些帳號存在
  if (!row || !secretEquals(row.password, password)) {
    throw createError({ statusCode: 401, statusMessage: 'invalid_credentials' })
  }

  setSession(event, row.id)
  return (await getCurrentUser(row.id))!
})
