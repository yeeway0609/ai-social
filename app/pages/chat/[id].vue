<script setup lang="ts">
type OutgoingStatus = 'pending' | 'failed'

/** 距離頁底多少像素內仍視為「在最底」，新訊息到達時才自動跟隨。 */
const AT_BOTTOM_THRESHOLD_PX = 80
const TEXT_COUNTER_THRESHOLD = 400

const route = useRoute()
const { user } = useAuth()
const conversationId = route.params.id as string

const [{ data: messages, status: messagesStatus }, { data: conversations }] = await Promise.all([
  useAsyncData(`conversation-${conversationId}-messages`, () => $fetch<MessageSummary[]>(`/api/conversations/${conversationId}/messages`), { server: false, default: () => [] }),
  useAsyncData('conversations', () => $fetch<ConversationSummary[]>('/api/conversations'), { server: false, default: () => [] })
])

const draft = ref('')
/** 樂觀訊息的送出狀態，以 temp id 為鍵；伺服器回應後移除。 */
const outgoingStatuses = ref(new Map<string, OutgoingStatus>())
const isPolling = ref(false)

const other = computed(() => {
  const row = conversations.value.find(row => row.conversationId === conversationId)
  return row?.other ?? messages.value.find(message => !message.isOwn)?.author ?? null
})
useHead({ title: () => other.value?.displayName ?? '對話' })

const draftLength = computed(() => draft.value.length)
const isOverLimit = computed(() => draftLength.value > MAX_TEXT_LENGTH)
const shouldShowCounter = computed(() => draftLength.value > TEXT_COUNTER_THRESHOLD)
const canSend = computed(() => draft.value.trim().length > 0 && !isOverLimit.value)
/** 輪詢游標只能用伺服器發的 id，樂觀訊息的 temp id 伺服器不認得。 */
const lastServerMessageId = computed(() => {
  for (let index = messages.value.length - 1; index >= 0; index--) {
    const message = messages.value[index]!
    if (!outgoingStatuses.value.has(message.id)) return message.id
  }
  return undefined
})

// 硬重新整理時 server: false 的資料在掛載後才到，所以以載入完成而非 onMounted 為捲動時機
watch(messagesStatus, (value) => {
  if (value === 'success') scrollToBottom()
}, { immediate: true })

useIntervalFn(pollNewMessages, CHAT_POLL_INTERVAL_MS)

function isAtBottom() {
  const { scrollHeight } = document.documentElement
  return window.innerHeight + window.scrollY >= scrollHeight - AT_BOTTOM_THRESHOLD_PX
}

async function scrollToBottom() {
  await nextTick()
  window.scrollTo({ top: document.documentElement.scrollHeight })
}

function appendMessages(incoming: MessageSummary[]) {
  const knownIds = new Set(messages.value.map(message => message.id))
  const fresh = incoming.filter(message => !knownIds.has(message.id))
  if (fresh.length === 0) return
  const shouldFollow = isAtBottom()
  // useAsyncData 的 data 是 shallowRef，就地 push 不會觸發更新
  messages.value = [...messages.value, ...fresh]
  if (shouldFollow) scrollToBottom()
}

async function pollNewMessages() {
  if (isPolling.value) return
  isPolling.value = true
  try {
    const incoming = await $fetch<MessageSummary[]>(`/api/conversations/${conversationId}/messages`, {
      query: { after: lastServerMessageId.value }
    })
    appendMessages(incoming)
  } catch {
    // 輪詢失敗下一輪會再試，不打擾使用者
  } finally {
    isPolling.value = false
  }
}

async function sendMessage(temporary: MessageSummary) {
  outgoingStatuses.value.set(temporary.id, 'pending')
  try {
    const saved = await $fetch<MessageSummary>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { text: temporary.originalText }
    })
    // 輪詢可能搶先把同一則拉回來了，這時只需把樂觀訊息拿掉
    const isAlreadyPolled = messages.value.some(message => message.id === saved.id)
    messages.value = messages.value.flatMap((message) => {
      if (message.id !== temporary.id) return [message]
      return isAlreadyPolled ? [] : [saved]
    })
    outgoingStatuses.value.delete(temporary.id)
  } catch {
    outgoingStatuses.value.set(temporary.id, 'failed')
  }
}

function handleSubmitSend() {
  if (!canSend.value || !user.value) return
  const text = draft.value.trim()
  draft.value = ''
  const temporary: MessageSummary = {
    id: `temp-${Date.now()}`,
    conversationId,
    author: user.value,
    originalText: text,
    isOwn: true,
    createdAt: new Date().toISOString()
  }
  messages.value = [...messages.value, temporary]
  scrollToBottom()
  sendMessage(temporary)
}

function handleClickRetry(temporary: MessageSummary) {
  if (outgoingStatuses.value.get(temporary.id) !== 'failed') return
  sendMessage(temporary)
}

function handleKeydownEnter(event: KeyboardEvent) {
  if (event.shiftKey || event.isComposing) return
  event.preventDefault()
  handleSubmitSend()
}
</script>

<template>
  <div class="flex min-h-[calc(100dvh-8rem)] flex-col">
    <header class="sticky top-12 z-10 flex h-12 items-center gap-2 border-b border-default bg-default/90 px-2 backdrop-blur">
      <UButton
        to="/chat"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-chevron-left"
        aria-label="回到聊天列表"
      />
      <template v-if="other">
        <UserAvatar
          :user="other"
          size="sm"
        />
        <div class="min-w-0 leading-tight">
          <p class="truncate text-sm font-medium">
            {{ other.displayName }}
          </p>
          <p class="truncate text-xs text-muted">
            @{{ other.handle }}
          </p>
        </div>
      </template>
      <USkeleton
        v-else
        class="h-5 w-24"
      />
    </header>

    <div class="flex-1 space-y-3 px-4 py-4">
      <p
        v-if="messages.length === 0"
        class="py-16 text-center text-sm text-muted"
      >
        還沒有訊息，說點什麼吧
      </p>
      <MessageBubble
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :is-pending="outgoingStatuses.get(message.id) === 'pending'"
        :is-failed="outgoingStatuses.get(message.id) === 'failed'"
        @retry="handleClickRetry(message)"
      />
    </div>

    <form
      class="sticky bottom-16 z-10 border-t border-default bg-default/95 px-3 py-2 backdrop-blur"
      @submit.prevent="handleSubmitSend"
    >
      <div class="flex items-end gap-2">
        <UTextarea
          v-model="draft"
          class="flex-1"
          autoresize
          :rows="1"
          :maxrows="5"
          placeholder="輸入訊息…"
          @keydown.enter="handleKeydownEnter"
        />
        <UButton
          type="submit"
          icon="i-lucide-send"
          aria-label="送出"
          :disabled="!canSend"
        />
      </div>
      <p
        v-if="shouldShowCounter"
        class="mt-1 text-right text-xs"
        :class="isOverLimit ? 'text-error' : 'text-muted'"
      >
        {{ draftLength }}／{{ MAX_TEXT_LENGTH }}
      </p>
    </form>
  </div>
</template>
