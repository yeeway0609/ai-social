/** 跨元件共享的登入者狀態；null 代表未登入、undefined 代表尚未查詢。 */
export function useAuth() {
  const user = useState<CurrentUser | null | undefined>('auth-user', () => undefined)

  async function fetchMe() {
    try {
      user.value = await $fetch<CurrentUser>('/api/me')
    } catch {
      user.value = null
    }
    return user.value
  }

  async function login(credentials: LoginRequest) {
    user.value = await $fetch<CurrentUser>('/api/auth/login', { method: 'POST', body: credentials })
    return user.value
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  async function saveSettings(settings: SettingsUpdate) {
    user.value = await $fetch<CurrentUser>('/api/me/settings', { method: 'PATCH', body: settings })
    return user.value
  }

  const isOnboarded = computed(() => !!user.value?.onboardedAt)

  return {
    user,
    isOnboarded,
    fetchMe,
    login,
    logout,
    saveSettings
  }
}
