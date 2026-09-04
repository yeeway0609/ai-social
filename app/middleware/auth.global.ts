const PUBLIC_PATHS = new Set(['/login'])

/** 未登入不能用 App；登入了但沒完成引導設定，只能待在引導設定頁。 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchMe } = useAuth()
  if (user.value === undefined) await fetchMe()

  const isPublic = PUBLIC_PATHS.has(to.path)
  if (!user.value) return isPublic ? undefined : navigateTo('/login')
  if (isPublic) return navigateTo('/')

  const isOnboarded = !!user.value.onboardedAt
  if (!isOnboarded && to.path !== '/onboarding') return navigateTo('/onboarding')
  if (isOnboarded && to.path === '/onboarding') return navigateTo('/')
})
