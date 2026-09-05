<script setup lang="ts">
/**
 * 一則內容（貼文／留言／訊息）的正文區，負責整個語氣層的讀者端行為：
 * 自己的內容直接顯示原文、不加任何標籤；他人的內容顯示列表帶回的改寫，還在預產中就先顯示骨架並輪詢；
 * 標籤只標改寫幅度，看到原文時標「原文」；「顯示原文」一次性切回、不呼叫模型。
 */
const props = withDefaults(defineProps<{
  kind: ContentKind
  content: ContentSummary
  /** 訊息氣泡等窄版面用小字。 */
  compact?: boolean
  /** 只有貼文頁才把語意相似度攤出來，列表保持只有幅度分級。 */
  showSemanticSimilarity?: boolean
}>(), { compact: false, showSemanticSimilarity: false })

const root = ref<HTMLElement | null>(null)
const rendition = ref<Rendition | null>(props.content.rendition)
const originalText = ref<string | null>(props.content.originalText)
const isPending = ref(props.content.isRenditionPending)
const isRevealingOriginal = ref(false)
const isLoadingOriginal = ref(false)
const isNearViewport = ref(false)
let pollCount = 0
let pollTimer: ReturnType<typeof setTimeout> | undefined

// 列表重抓（例如換語氣後）會給同一個元件新的 content，跟著換
watch(() => props.content, (content) => {
  rendition.value = content.rendition
  originalText.value = content.originalText ?? originalText.value
  isPending.value = content.isRenditionPending
  pollCount = 0
})

const displayText = computed(() => {
  if (props.content.isOwn) return props.content.originalText
  if (isRevealingOriginal.value) return originalText.value
  if (rendition.value) return rendition.value.text
  return isPending.value ? null : originalText.value
})
const isOriginalShown = computed(() => isRevealingOriginal.value || rendition.value === null)
const isLoading = computed(() => displayText.value === null)
const canReveal = computed(() => !props.content.isOwn && rendition.value !== null)
const scaleLabel = computed(() => rendition.value ? REWRITE_SCALE_LABELS[rendition.value.scale] : null)
const semanticSimilarityLabel = computed(() => {
  const semanticSimilarity = rendition.value?.semanticSimilarity
  if (!props.showSemanticSimilarity || !semanticSimilarity) return null
  if (semanticSimilarity.status === 'unavailable') return '語意相似度暫不可用'
  return `語意相似度 ${(semanticSimilarity.score * 100).toFixed(1)}%`
})

useIntersectionObserver(root, ([entry]) => {
  if (entry?.isIntersecting) isNearViewport.value = true
}, { rootMargin: '600px 0px' })

/** 預產還沒跑完時每隔幾秒撈一次；超過次數就放棄，改顯示原文。 */
async function pollRendition() {
  try {
    const result = await $fetch<RenditionLookup>('/api/renditions', { query: { kind: props.kind, id: props.content.id } })
    rendition.value = result.rendition
    if (result.originalText !== null) originalText.value = result.originalText
    isPending.value = result.isPending && ++pollCount < RENDITION_POLL_MAX_COUNT
  } catch {
    isPending.value = ++pollCount < RENDITION_POLL_MAX_COUNT
  }
  if (isPending.value) pollTimer = setTimeout(pollRendition, RENDITION_POLL_INTERVAL_MS)
  else if (!rendition.value && originalText.value === null) await loadOriginal()
}

watch([isNearViewport, isPending], ([isNear, pending]) => {
  clearTimeout(pollTimer)
  if (isNear && pending && !props.content.isOwn) pollTimer = setTimeout(pollRendition, RENDITION_POLL_INTERVAL_MS)
  // 不在等待期、又沒有改寫（預產失敗）：列表沒帶原文，要另外抓
  else if (isNear && !pending && !rendition.value && !props.content.isOwn && originalText.value === null) loadOriginal()
}, { immediate: true })

onBeforeUnmount(() => clearTimeout(pollTimer))

async function loadOriginal() {
  if (originalText.value !== null || isLoadingOriginal.value) return
  isLoadingOriginal.value = true
  try {
    const result = await $fetch<OriginalResult>('/api/original', { query: { kind: props.kind, id: props.content.id } })
    originalText.value = result.text
  } catch {
    originalText.value = '（載入失敗）'
  } finally {
    isLoadingOriginal.value = false
  }
}

async function handleClickReveal() {
  if (isRevealingOriginal.value) {
    isRevealingOriginal.value = false
    return
  }
  await loadOriginal()
  isRevealingOriginal.value = true
}
</script>

<template>
  <div
    ref="root"
    class="min-w-0"
  >
    <Transition
      name="swap"
      mode="out-in"
    >
      <span
        v-if="isLoading && compact"
        class="typing-dots"
        role="status"
        aria-label="改寫中"
      >
        <i /><i /><i />
      </span>
      <div
        v-else-if="isLoading"
        class="space-y-2 py-0.5"
      >
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-4/5" />
      </div>
      <p
        v-else
        :key="displayText ?? ''"
        class="whitespace-pre-wrap break-words leading-relaxed"
        :class="compact ? 'text-sm' : 'text-[15px]'"
      >
        {{ displayText }}
      </p>
    </Transition>

    <div
      v-if="!content.isOwn"
      class="mt-1.5 flex flex-wrap items-center gap-1.5"
    >
      <Transition
        name="swap"
        mode="out-in"
      >
        <UBadge
          v-if="!isLoading && isOriginalShown"
          key="original"
          color="neutral"
          variant="subtle"
          size="sm"
          icon="i-mingcute-quote-left-line"
        >
          原文
        </UBadge>
        <UBadge
          v-else-if="!isLoading"
          key="rewritten"
          color="primary"
          variant="subtle"
          size="sm"
          icon="i-mingcute-sparkles-2-fill"
        >
          {{ scaleLabel }}
        </UBadge>
      </Transition>
      <span
        v-if="!isLoading && !isOriginalShown && semanticSimilarityLabel"
        class="text-xs text-muted"
      >{{ semanticSimilarityLabel }}</span>
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
