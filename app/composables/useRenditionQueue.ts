/**
 * 讀者端的改寫請求佇列：同時最多 MAX_CONCURRENT_RENDERS 個在飛，其餘排隊。
 * epoch 在讀者改語氣設定時遞增，讓所有已掛載的內容知道要重新改寫。
 */
interface PendingRendition {
  request: RenderRequest
  cacheKey: string
  resolve: (result: RenditionResult) => void
  reject: (reason: unknown) => void
}

export function useRenditionQueue() {
  const epoch = useState('rendition-epoch', () => 0)
  const cache = useState<Record<string, RenditionResult>>('rendition-cache', () => ({}))
  const queue = useState<PendingRendition[]>('rendition-queue', () => [])
  const activeCount = useState('rendition-active', () => 0)

  function cacheKey(request: RenderRequest) {
    return `${epoch.value}:${request.kind}:${request.id}`
  }

  function pump() {
    while (activeCount.value < MAX_CONCURRENT_RENDERS && queue.value.length > 0) {
      const availableCount = MAX_CONCURRENT_RENDERS - activeCount.value
      const batch = queue.value.splice(0, Math.min(MAX_RENDER_BATCH_COUNT, availableCount, queue.value.length))
      activeCount.value += batch.length
      $fetch<RenderBatchResult>('/api/render/batch', {
        method: 'POST',
        body: { items: batch.map(entry => entry.request) }
      })
        .then((result) => {
          if (result.items.length !== batch.length) {
            batch.forEach(entry => entry.reject(new Error('result_identity_mismatch')))
            return
          }
          result.items.forEach((item, index) => {
            const pending = batch[index]
            if (!pending || item.kind !== pending.request.kind || item.id !== pending.request.id) {
              pending?.reject(new Error('result_identity_mismatch'))
              return
            }
            cache.value[pending.cacheKey] = item
            pending.resolve(item)
          })
        }, (err) => {
          batch.forEach(entry => entry.reject(err))
        })
        .finally(() => {
          activeCount.value -= batch.length
          pump()
        })
    }
  }

  function render(request: RenderRequest, options: { refresh?: boolean } = {}): Promise<RenditionResult> {
    const key = cacheKey(request)
    if (options.refresh) {
      const { [key]: _removed, ...nextCache } = cache.value
      cache.value = nextCache
    }
    const cached = cache.value[key]
    if (cached) return Promise.resolve(cached)

    return new Promise((resolve, reject) => {
      queue.value.push({ request, cacheKey: key, resolve, reject })
      pump()
    })
  }

  function invalidateAll() {
    epoch.value++
    cache.value = {}
  }

  return {
    epoch,
    render,
    invalidateAll
  }
}
