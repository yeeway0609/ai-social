<script setup lang="ts">
const props = withDefaults(defineProps<{
  message: MessageSummary
  /** 已送出但伺服器尚未回應的樂觀訊息。 */
  isSending?: boolean
  isFailed?: boolean
}>(), { isSending: false, isFailed: false })

const emit = defineEmits<{ retry: [] }>()

const clockTime = computed(() => formatClockTime(props.message.createdAt))
</script>

<template>
  <div
    class="flex items-end gap-2"
    :class="message.isOwn ? 'justify-end' : 'justify-start'"
  >
    <UserAvatar
      v-if="!message.isOwn"
      class="mb-5"
      :user="message.author"
      size="sm"
    />

    <div
      class="flex max-w-[80%] flex-col gap-0.5"
      :class="message.isOwn ? 'items-end' : 'items-start'"
    >
      <div
        class="rounded-md px-3 py-2 transition-colors duration-(--duration-fast)"
        :class="[
          message.isOwn ? 'rounded-br-none bg-primary text-inverted glow-primary-soft' : 'rounded-bl-none border border-accented bg-elevated has-[.typing-dots]:border-transparent has-[.typing-dots]:bg-transparent has-[.typing-dots]:px-0',
          isSending && 'opacity-70'
        ]"
      >
        <ContentBody
          kind="message"
          :content="message"
          compact
        />
      </div>

      <UButton
        v-if="isFailed"
        color="error"
        variant="link"
        size="xs"
        icon="i-mingcute-refresh-2-line"
        label="傳送失敗，點擊重試"
        @click="emit('retry')"
      />
      <span
        v-else
        class="px-1 font-mono text-[11px] text-muted"
      >{{ isSending ? '傳送中…' : clockTime }}</span>
    </div>
  </div>
</template>
