<script setup lang="ts">
/** 貼文與留言共用的純文字輸入框：送出的就是原文，這裡沒有預覽也沒有 AI。 */
withDefaults(defineProps<{
  placeholder: string
  submitLabel: string
  autofocus?: boolean
}>(), { autofocus: false })

/** done(true) 清空輸入框、done(false) 保留內容讓使用者重試；兩者都會結束送出中狀態。 */
const emit = defineEmits<{ submit: [text: string, done: (isSuccess: boolean) => void] }>()

const text = ref('')
const isSubmitting = ref(false)

const trimmedText = computed(() => text.value.trim())
// 用 UTF-16 長度計，跟伺服器 zod 的 max 同一種算法，前端說能送的伺服器一定收
const charCount = computed(() => text.value.length)
const isOverLimit = computed(() => charCount.value > MAX_TEXT_LENGTH)
const canSubmit = computed(() => trimmedText.value.length > 0 && !isOverLimit.value && !isSubmitting.value)

function handleSubmitText() {
  if (!canSubmit.value) return
  isSubmitting.value = true
  emit('submit', trimmedText.value, (isSuccess) => {
    if (isSuccess) text.value = ''
    isSubmitting.value = false
  })
}
</script>

<template>
  <form
    class="space-y-2"
    @submit.prevent="handleSubmitText"
  >
    <UTextarea
      v-model="text"
      class="w-full"
      autoresize
      :rows="3"
      :maxrows="12"
      :placeholder="placeholder"
      :autofocus="autofocus"
      :disabled="isSubmitting"
      @keydown.meta.enter.prevent="handleSubmitText"
      @keydown.ctrl.enter.prevent="handleSubmitText"
    />
    <div class="flex items-center justify-between gap-3">
      <span
        class="text-xs tabular-nums"
        :class="isOverLimit ? 'text-error' : 'text-muted'"
      >
        {{ charCount }} / {{ MAX_TEXT_LENGTH }}
      </span>
      <UButton
        type="submit"
        size="sm"
        class="reveal-arrow-button pr-4"
        :loading="isSubmitting"
        :disabled="!canSubmit"
      >
        <span class="reveal-label">{{ submitLabel }}</span>
        <UIcon
          class="reveal-arrow size-4"
          name="i-mingcute-arrow-right-line"
        />
      </UButton>
    </div>
  </form>
</template>
