/**
 * 呼叫本機或 Preview 的預產端點，把所有還沒改寫的貼文與留言灌好預設語氣。
 * 用法：pnpm prerender <provider> <apiKey> [base-url]
 *   provider／apiKey：用這把金鑰產所有內容，金鑰只經過這次請求、不會存進資料庫
 *   base-url：dev server 位址，預設 http://localhost:3000
 */
const secret = process.env.NUXT_ADMIN_SECRET
if (!secret) throw new Error('NUXT_ADMIN_SECRET 未設定')

const [provider, apiKey, base = 'http://localhost:3000'] = process.argv.slice(2)
if (!provider || !apiKey) throw new Error('用法：pnpm prerender <provider> <apiKey> [base-url]')
let round = 0
while (true) {
  round++
  const response = await fetch(`${base}/api/admin/prerender`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-secret': secret },
    body: JSON.stringify({ limit: 20, provider, apiKey })
  })
  if (!response.ok) throw new Error(`預產失敗：${response.status} ${await response.text()}`)
  const result = await response.json() as { processedPosts: number, processedComments: number, generated: number, failed: number }
  console.log(`第 ${round} 批：貼文 ${result.processedPosts}、留言 ${result.processedComments}，產出 ${result.generated}、失敗 ${result.failed}`)
  if (result.processedPosts + result.processedComments === 0) break
  // 全部失敗代表金鑰或額度有問題，繼續跑只會空轉
  if (result.generated === 0 && result.failed > 0) throw new Error('這一批全部失敗，先檢查金鑰池與模型設定')
}
console.log('預產完成')
