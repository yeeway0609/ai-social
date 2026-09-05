import { z } from 'zod'
import { requireUserId } from '../../utils/session'
import { getUserByUsername } from '../../utils/users'

const params = z.object({ username: z.string().min(1) })

export default defineEventHandler(async (event): Promise<UserSummary> => {
  requireUserId(event)
  const { username } = params.parse(getRouterParams(event))
  const user = await getUserByUsername(username.toLowerCase())
  if (!user) throw createError({ statusCode: 404, statusMessage: 'user_not_found' })
  return user
})
