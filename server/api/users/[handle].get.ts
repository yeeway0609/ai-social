import { z } from 'zod'
import { requireUserId } from '../../utils/session'
import { getUserByHandle } from '../../utils/users'

const params = z.object({ handle: z.string().min(1) })

export default defineEventHandler(async (event): Promise<UserSummary> => {
  requireUserId(event)
  const { handle } = params.parse(getRouterParams(event))
  const user = await getUserByHandle(handle.toLowerCase())
  if (!user) throw createError({ statusCode: 404, statusMessage: 'user_not_found' })
  return user
})
