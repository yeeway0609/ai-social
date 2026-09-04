<script setup lang="ts">
const TABS = [
  { to: '/', label: '動態牆', icon: 'i-lucide-home' },
  { to: '/compose', label: '發文', icon: 'i-lucide-pen-line' },
  { to: '/chat', label: '聊天', icon: 'i-lucide-message-circle' },
  { to: '/me', label: '我', icon: 'i-lucide-user' }
]

const route = useRoute()
const { user } = useAuth()
const credentialWarning = useCredentialWarning()

const currentTone = computed(() => findTone(user.value?.tone ?? ORIGINAL_TONE))

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <div class="min-h-dvh bg-default text-default">
    <header class="sticky top-0 z-20 border-b border-default bg-default/90 backdrop-blur">
      <div class="mx-auto flex h-12 max-w-xl items-center justify-between px-4">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight">
          AI Social
        </NuxtLink>
        <UButton
          v-if="user"
          to="/settings"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-sliders-horizontal"
          :label="currentTone?.label ?? '設定語氣'"
        />
      </div>
      <UAlert
        v-if="credentialWarning.isVisible.value"
        class="rounded-none"
        color="warning"
        variant="soft"
        icon="i-lucide-key-round"
        title="共用額度用完了，目前顯示原文"
        description="到設定頁填入你自己的 API 金鑰就能繼續改寫。"
        :actions="[{ label: '前往設定', to: '/settings', color: 'warning', variant: 'solid', size: 'xs' }]"
        :close="true"
        @update:open="credentialWarning.dismiss()"
      />
    </header>

    <main class="mx-auto w-full max-w-xl pb-20">
      <slot />
    </main>

    <nav v-if="user" class="fixed inset-x-0 bottom-0 z-20 border-t border-default bg-default/95 backdrop-blur">
      <ul class="mx-auto grid max-w-xl grid-cols-4">
        <li v-for="tab in TABS" :key="tab.to">
          <NuxtLink
            class="flex flex-col items-center gap-0.5 py-2 text-[11px]"
            :class="isActive(tab.to) ? 'text-primary' : 'text-muted'"
            :to="tab.to"
          >
            <UIcon :name="tab.icon" class="size-6" />
            {{ tab.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
