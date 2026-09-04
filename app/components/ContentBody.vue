<script setup lang="ts">
/**
 * 一則內容（貼文／留言／訊息）的正文區，負責整個語氣層的讀者端行為：
 * 自己的內容直接顯示原文；他人的內容進入可視範圍前排隊改寫、完成前顯示骨架；
 * 標籤標示「AI 改寫」或「原文」；「顯示原文」一次性切回、不呼叫模型。
 */
const props = withDefaults(defineProps<{
  kind: ContentKind
  content: ContentSummary
  /** 訊息氣泡等窄版面用小字。 */
  compact?: boolean
}>(), { compact: false })

const emit = defineEmits<{ renderFailed: [error: RenditionResult['error']] }>()

const { epoch, render } = useRenditionQueue()
const credentialWarning = useCredentialWarning()

const root = ref<HTMLElement | null>(null)
const rendition = ref<RenditionResult | null>(null)
const originalText = ref<string | null>(props.content.originalText)
const isRevealingOriginal = ref(false)
const isLoadingOriginal = ref(false)
const isNearViewport = ref(false)
const renderedEpoch = ref(-1)

const displayText = computed(() => {
  if (props.content.isOwn) return props.content.originalText
  if (isRevealingOriginal.value) return originalText.value
  return rendition.value?.text ?? null
})
const isOriginalShown = computed(() => props.content.isOwn || isRevealingOriginal.value || rendition.value?.isOriginal === true)
const isLoading = computed(() => displayText.value === null)
const canReveal = computed(() => !props.content.isOwn && rendition.value && !rendition.value.isOriginal)
const scaleLabel = computed(() => rendition.value?.scale ? REWRITE_SCALE_LABELS[rendition.value.scale] : null)

useIntersectionObserver(root, ([entry]) => {
  if (entry?.isIntersecting) isNearViewport.value = true
}, { rootMargin: '600px 0px' })

watch([isNearViewport, epoch], async ([isNear, currentEpoch]) => {
  if (!isNear || props.content.isOwn || renderedEpoch.value === currentEpoch) return
  renderedEpoch.value = currentEpoch
  rendition.value = null
  isRevealingOriginal.value = false
  try {
    const result = await render({ kind: props.kind, id: props.content.id })
    rendition.value = result
    if (result.isOriginal) originalText.value = result.text
    if (result.error) {
      emit('renderFailed', result.error)
      if (result.error === 'no_ai_credential') credentialWarning.show()
    }
  } catch {
    emit('renderFailed', 'provider_error')
    rendition.value = { kind: props.kind, id: props.content.id, text: '（載入失敗）', isOriginal: true, scale: null, source: null, error: 'provider_error' }
  }
}, { immediate: true })

async function handleClickReveal() {
  if (isRevealingOriginal.value) {
    isRevealingOriginal.value = false
    return
  }
  if (originalText.value === null) {
    isLoadingOriginal.value = true
    try {
      const result = await $fetch<OriginalResult>('/api/original', { query: { kind: props.kind, id: props.content.id } })
      originalText.value = result.text
    } finally {
      isLoadingOriginal.value = false
    }
  }
  isRevealingOriginal.value = true
}
</script>

<template>
  <div
    ref="root"
    class="min-w-0"
  >
    <div
      v-if="isLoading"
      class="space-y-2 py-0.5"
    >
      <USkeleton class="h-4 w-full" />
      <USkeleton class="h-4 w-4/5" />
    </div>
    <p
      v-else
      class="whitespace-pre-wrap break-words leading-relaxed"
      :class="compact ? 'text-sm' : 'text-[15px]'"
    >
      {{ displayText }}
    </p>

    <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
      <template v-if="!isLoading">
        <UBadge
          v-if="isOriginalShown"
          color="neutral"
          variant="subtle"
          size="sm"
          icon="i-lucide-quote"
        >
          原文
        </UBadge>
        <UBadge
          v-else
          color="primary"
          variant="subtle"
          size="sm"
          icon="i-lucide-sparkles"
        >
          AI 改寫<template v-if="scaleLabel">
            ・{{ scaleLabel }}
          </template>
        </UBadge>
      </template>
      <UButton
        v-if="canReveal"
        color="neutral"
        variant="link"
        size="xs"
        :loading="isLoadingOriginal"
        :label="isRevealingOriginal ? '回到改寫版' : '顯示原文'"
        @click.stop="handleClickReveal"
      />
    </div>
  </div>
</template>
