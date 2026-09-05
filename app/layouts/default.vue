<script setup lang="ts">
const TABS = [
  { to: '/', label: '動態牆', icon: 'i-mingcute-home-4-line', activeIcon: 'i-mingcute-home-4-fill' },
  { to: '/compose', label: '發文', icon: 'i-mingcute-quill-pen-line', activeIcon: 'i-mingcute-quill-pen-fill' },
  { to: '/chat', label: '聊天', icon: 'i-mingcute-chat-2-line', activeIcon: 'i-mingcute-chat-2-fill' },
  { to: '/me', label: '我', icon: 'i-mingcute-user-4-line', activeIcon: 'i-mingcute-user-4-fill' }
]

const route = useRoute()
const { user } = useAuth()
const credentialWarning = useCredentialWarning()

const currentTone = computed(() => (user.value?.tone ? findTone(user.value.tone) : undefined))

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  // 「我」分頁實際落在 /users/<自己的 username>，路徑不含 /me
  if (to === '/me') return route.path === '/me' || (!!user.value && route.path === `/users/${user.value.username}`)
  return route.path.startsWith(to)
}

const activeTabIndex = computed(() => TABS.findIndex(tab => isActive(tab.to)))
</script>

<template>
  <div class="min-h-dvh bg-default text-default">
    <header class="sticky top-0 z-20 border-b border-default bg-default/90 backdrop-blur">
      <div class="mx-auto flex h-12 max-w-xl items-center justify-between px-4">
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
        >
          <BrandLogo
            class="text-primary"
            size="size-7"
          />
          <span class="page-title text-lg normal-case">不痛 Tone</span>
        </NuxtLink>
        <UButton
          v-if="user"
          to="/settings"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-mingcute-settings-3-line"
          :label="currentTone?.label ?? '設定語氣'"
        />
      </div>
      <UAlert
        v-if="credentialWarning.isVisible.value"
        class="rounded-none"
        color="warning"
        variant="soft"
        icon="i-mingcute-key-2-line"
        title="未設定可用金鑰，目前顯示原文"
        description="到設定頁填入你自己的 API 金鑰，或等共用池恢復後再重試。"
        :actions="[{ label: '前往設定', to: '/settings', color: 'warning', variant: 'solid', size: 'xs' }]"
        :close="true"
        @update:open="credentialWarning.dismiss()"
      />
    </header>

    <main class="mx-auto w-full max-w-xl pb-20">
      <slot />
    </main>

    <nav
      v-if="user"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-default bg-default/95 backdrop-blur"
    >
      <ul class="relative mx-auto grid max-w-xl grid-cols-4">
        <!-- 在四格之間滑動的指示器；沒有任何分頁被選中時（如設定頁）藏起來 -->
        <span
          v-show="activeTabIndex >= 0"
          class="pointer-events-none absolute -top-px h-0.5 w-1/4 transition-transform duration-(--duration-slow) ease-spring"
          :style="{ transform: `translateX(${Math.max(activeTabIndex, 0) * 100}%)` }"
          aria-hidden="true"
        >
          <span class="mx-auto block h-full w-10 bg-primary glow-primary" />
        </span>
        <li
          v-for="tab in TABS"
          :key="tab.to"
        >
          <NuxtLink
            class="relative flex flex-col items-center gap-1 py-2.5 label-mono transition-colors duration-(--duration-base) active:scale-95"
            :class="isActive(tab.to) ? 'text-primary' : 'text-muted hover:text-default'"
            :to="tab.to"
          >
            <span class="relative flex size-6 items-center justify-center">
              <Transition name="spin-swap">
                <UIcon
                  :key="isActive(tab.to) ? 'active' : 'idle'"
                  :name="isActive(tab.to) ? tab.activeIcon : tab.icon"
                  class="size-6"
                />
              </Transition>
            </span>
            {{ tab.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
