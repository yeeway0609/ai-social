/**
 * 動態牆與個人頁共用的游標分頁貼文列表：第一頁走 useAsyncData，
 * 後續頁面由底部哨兵進入可視範圍時接上；「載入新貼文」另外抓第一頁合併進來，不打掉已捲到的頁。
 */
export async function usePostFeed(key: string, url: string) {
  const items = ref<PostSummary[]>([])
  const nextCursor = ref<string | null>(null)
  const isLoadingMore = ref(false)
  const isRefreshing = ref(false)
  /** 背景輪詢進行中；與手動重抓互斥，但不影響畫面。 */
  let isPolling = false
  const sentinel = ref<HTMLElement | null>(null)

  // 這支 composable 內部會 await，而 await 之後 Vue 就找不到元件實例；
  // 所以生命週期與 observer 都要在 await 之前註冊，只有 data 的同步交給 watch。
  const asyncData = useAsyncData(key, () => $fetch<Page<PostSummary>>(url), { server: false })
  const { data: firstPage, status, error } = asyncData

  const isLoadingFirstPage = computed(() => status.value === 'pending' && items.value.length === 0)
  const hasMore = computed(() => nextCursor.value !== null)

  // server: false 時初次載入的資料要等 hydration 後才到，所以用 watch 而不是直接讀 firstPage
  watch(firstPage, (page) => {
    if (!page) return
    items.value = page.items
    nextCursor.value = page.nextCursor
  }, { immediate: true })

  useIntersectionObserver(sentinel, ([entry]) => {
    if (entry?.isIntersecting) loadMore()
  }, { rootMargin: '400px 0px' })

  // 從別頁回來時 useAsyncData 直接給快取，不會再打 API；這裡補抓一次讓剛發的貼文出現在最上方
  onMounted(() => {
    if (firstPage.value) refreshLatest()
  })

  // 背景輪詢不轉重新整理鈕的 loading，否則每三秒閃一次
  useIntervalFn(() => refreshLatest({ isSilent: true }), FEED_POLL_INTERVAL_MS)

  await asyncData

  async function loadMore() {
    if (isLoadingMore.value || nextCursor.value === null) return
    isLoadingMore.value = true
    try {
      const page = await $fetch<Page<PostSummary>>(url, { query: { cursor: nextCursor.value } })
      const knownIds = new Set(items.value.map(post => post.id))
      items.value.push(...page.items.filter(post => !knownIds.has(post.id)))
      nextCursor.value = page.nextCursor
    } finally {
      isLoadingMore.value = false
    }
  }

  /** 重抓第一頁：新貼文插到最上方，已在列表裡的就地更新讚數與留言數。 */
  async function refreshLatest(options: { isSilent?: boolean } = {}) {
    if (isRefreshing.value || isPolling) return
    if (options.isSilent) isPolling = true
    else isRefreshing.value = true
    try {
      const page = await $fetch<Page<PostSummary>>(url)
      const wasEmpty = items.value.length === 0
      const fresh: PostSummary[] = []
      for (const post of page.items) {
        const index = items.value.findIndex(existing => existing.id === post.id)
        if (index === -1) fresh.push(post)
        else items.value[index] = post
      }
      items.value.unshift(...fresh)
      // 原本是空列表（例如剛看過空的動態牆）才接手第一頁的游標，否則會把已捲到的位置拉回開頭
      if (wasEmpty) nextCursor.value = page.nextCursor
    } finally {
      isRefreshing.value = false
      isPolling = false
    }
  }

  function removePost(id: string) {
    items.value = items.value.filter(post => post.id !== id)
  }

  function updatePost(id: string, patch: Partial<PostSummary>) {
    const index = items.value.findIndex(post => post.id === id)
    if (index !== -1) items.value[index] = { ...items.value[index]!, ...patch }
  }

  return {
    items,
    sentinel,
    error,
    isLoadingFirstPage,
    isLoadingMore,
    isRefreshing,
    hasMore,
    loadMore,
    refreshLatest,
    removePost,
    updatePost
  }
}
