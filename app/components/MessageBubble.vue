<script setup lang="ts">
const props = withDefaults(defineProps<{
  message: MessageSummary
  /** 已送出但伺服器尚未回應的樂觀訊息。 */
  isPending?: boolean
  isFailed?: boolean
}>(), { isPending: false, isFailed: false })

const emit = defineEmits<{ retry: [] }>()

/**
 * 樂觀訊息的 id 不是伺服器發的 uuid，丟給改寫服務會被拒；
 * 反正它一定是自己的訊息，直接顯示原文即可。
 */
const isTemporary = computed(() => props.message.id.startsWith('temp-'))
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
        class="rounded-2xl px-3 py-2"
        :class="[
          message.isOwn ? 'rounded-br-sm bg-primary text-inverted' : 'rounded-bl-sm bg-elevated',
          isPending && 'opacity-70'
        ]"
      >
        <p
          v-if="isTemporary"
          class="whitespace-pre-wrap break-words text-sm leading-relaxed"
        >
          {{ message.originalText }}
        </p>
        <ContentBody
          v-else
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
        icon="i-lucide-refresh-cw"
        label="傳送失敗，點擊重試"
        @click="emit('retry')"
      />
      <span
        v-else
        class="px-1 text-[11px] text-muted"
      >{{ isPending ? '傳送中…' : clockTime }}</span>
    </div>
  </div>
</template>
