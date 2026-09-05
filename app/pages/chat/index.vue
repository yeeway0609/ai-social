<script setup lang="ts">
useHead({ title: '聊天' })

const toast = useToast()

const { data: conversations, status } = await useAsyncData('conversations', () => $fetch<ConversationSummary[]>('/api/conversations'), { server: false, default: () => [] })

const openingUserId = ref<string | null>(null)

const isLoading = computed(() => status.value === 'pending' || status.value === 'idle')

/** 列表只放一行預覽：自己的訊息給原文；對方的訊息和對話內一樣只給改寫版，還沒改寫好就先留白。 */
function previewText(row: ConversationSummary) {
  const message = row.lastMessage
  if (!message) return null
  if (message.isOwn) return `你：${message.originalText}`
  return message.rendition?.text ?? message.originalText ?? '…'
}

async function handleClickConversation(row: ConversationSummary) {
  if (openingUserId.value) return
  openingUserId.value = row.other.id
  try {
    const { conversationId } = await $fetch<{ conversationId: string }>(`/api/conversations/with/${row.other.id}`, { method: 'POST' })
    await navigateTo(`/chat/${conversationId}`)
  } catch {
    toast.add({ title: '無法開啟對話', color: 'error' })
  } finally {
    openingUserId.value = null
  }
}
</script>

<template>
  <div class="px-4 py-4">
    <h1 class="page-title text-lg">
      聊天
    </h1>

    <ul
      v-if="isLoading"
      class="mt-4 divide-y divide-default"
    >
      <li
        v-for="index in 4"
        :key="index"
        class="flex items-center gap-3 py-3"
      >
        <USkeleton class="size-10 rounded-full" />
        <div class="flex-1 space-y-2">
          <USkeleton class="h-4 w-1/3" />
          <USkeleton class="h-3 w-1/4" />
        </div>
      </li>
    </ul>

    <div
      v-else-if="conversations.length === 0"
      class="mt-16 flex flex-col items-center gap-2 text-center text-muted"
    >
      <UIcon
        name="i-mingcute-group-2-line"
        class="size-10"
      />
      <p class="text-sm">
        還沒有其他使用者可以聊天
      </p>
    </div>

    <ul
      v-else
      class="mt-4 divide-y divide-default"
    >
      <li
        v-for="row in conversations"
        :key="row.other.id"
      >
        <button
          class="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-elevated/60 disabled:opacity-60"
          type="button"
          :disabled="openingUserId !== null"
          @click="handleClickConversation(row)"
        >
          <UserAvatar :user="row.other" />
          <div class="min-w-0 flex-1">
            <p
              class="truncate"
              :class="row.unreadCount > 0 ? 'font-semibold' : 'font-medium'"
            >
              {{ row.other.displayName }}
            </p>
            <p
              class="truncate text-sm"
              :class="row.unreadCount > 0 ? 'font-medium text-default' : 'text-muted'"
            >
              {{ previewText(row) ?? `@${row.other.username}` }}
            </p>
          </div>
          <UIcon
            v-if="openingUserId === row.other.id"
            name="i-mingcute-loading-3-line"
            class="size-4 animate-spin text-muted"
          />
          <div
            v-else-if="row.lastMessageAt"
            class="flex shrink-0 flex-col items-end gap-1"
          >
            <span
              class="text-xs"
              :class="row.unreadCount > 0 ? 'font-medium text-primary' : 'text-muted'"
            >
              {{ formatRelativeTime(row.lastMessageAt) }}
            </span>
            <span
              v-if="row.unreadCount > 0"
              class="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold leading-none text-white"
              :aria-label="`${row.unreadCount} 則未讀`"
            >
              {{ row.unreadCount > 99 ? '99+' : row.unreadCount }}
            </span>
          </div>
        </button>
      </li>
    </ul>
  </div>
</template>
