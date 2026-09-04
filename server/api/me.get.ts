import { requireUserId } from '../utils/session'
import { getCurrentUser } from '../utils/users'

export default defineEventHandler(async (event): Promise<CurrentUser> => {
  const user = await getCurrentUser(requireUserId(event))
  // cookie 簽章有效但帳號已被刪：視同未登入，讓前端導回登入頁
  if (!user) throw createError({ statusCode: 401, statusMessage: 'unauthenticated' })
  return user
})
