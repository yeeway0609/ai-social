/**
 * 讀者端的改寫請求佇列：同時最多 MAX_CONCURRENT_RENDERS 個在飛，其餘排隊。
 * epoch 在讀者改語氣設定時遞增，讓所有已掛載的內容知道要重新改寫。
 */
export function useRenditionQueue() {
  const epoch = useState('rendition-epoch', () => 0)
  const queue = useState<Array<() => void>>('rendition-queue', () => [])
  const activeCount = useState('rendition-active', () => 0)

  function pump() {
    while (activeCount.value < MAX_CONCURRENT_RENDERS && queue.value.length > 0) {
      const next = queue.value.shift()!
      activeCount.value++
      next()
    }
  }

  function render(request: RenderRequest): Promise<RenditionResult> {
    return new Promise((resolve, reject) => {
      queue.value.push(() => {
        $fetch<RenditionResult>('/api/render', { method: 'POST', body: request })
          .then(resolve, reject)
          .finally(() => {
            activeCount.value--
            pump()
          })
      })
      pump()
    })
  }

  function invalidateAll() {
    epoch.value++
  }

  return {
    epoch,
    render,
    invalidateAll
  }
}
