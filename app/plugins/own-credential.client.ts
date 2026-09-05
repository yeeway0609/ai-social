/**
 * 每個打到本站 API 的請求都夾帶瀏覽器裡的自備金鑰標頭。
 * 只對同源的 /api 路徑加，避免金鑰跟著任何外部請求送出去。
 */
export default defineNuxtPlugin(() => {
  globalThis.$fetch = $fetch.create({
    onRequest({ request, options }) {
      const url = typeof request === 'string' ? request : request.url
      if (!url.startsWith('/api/')) return
      for (const [name, value] of Object.entries(ownCredentialHeaders())) {
        options.headers.set(name, value)
      }
    }
  })
})
