import { requireUserId } from '../utils/session'
import { getCurrentUser } from '../utils/users'

export default defineEventHandler(async (event): Promise<CurrentUser> => {
  const user = await getCurrentUser(await requireUserId(event))
  if (!user) throw createError({ statusCode: 401, statusMessage: 'unauthenticated' })
  return user
})
