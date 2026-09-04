---
paths:
  - "server/**/*.ts"
  - "drizzle.config.ts"
---

## 分層與依賴方向

`server/api/*（路由）→ server/utils/*（領域邏輯）→ server/db（Drizzle）`。

- 路由只做三件事：取 session、驗輸入、把結果整形成回應。不在路由裡組 Drizzle statement。
- 領域邏輯放 `server/utils/` 的具名模組（`ai/credentials.ts`、`crypto.ts`），檔名貼合領域概念而非技術分類。
- **不要建通用 repository 或泛型 CRUD**：查詢的形狀本來就各不相同，通用基底只會逼出一堆參數旗標。Drizzle 的 query builder 已經夠薄，直接寫。

## 輸入驗證

- **每個吃 body 或 query 的端點都用 zod schema 驗**，不手寫 `if (!x)`。schema 宣告在檔案頂端、命名為 `body` 或 `query`。
- 值域是前後端共用的（provider 等）就從 `shared/` import 常數陣列給 `z.enum`，不要在後端另抄一份字串聯集。

## 錯誤處理

- 預期中的失敗用 `createError({ statusCode, statusMessage })`；`statusMessage` 用機器可讀的 snake_case 錯誤碼（`unauthenticated`、`no_ai_credential`），前端據此分流。
- **領域錯誤定義成 class 並帶 `code`**（見 `NoCredentialError`），由路由決定映射到哪個狀態碼——同一個領域錯誤在不同端點可能該回 401 也可能該回 402。
- **catch 具體例外**，不寫 `catch (e)` 就吞掉。外部模型 API 的逾時與額度用盡要各自捕捉並轉成對應錯誤碼，因為前端對這兩者的處置完全不同（重試 vs 導去設定金鑰）。

## 金鑰與密文

- **使用者自備的 API key 明文不得離開它進來的那個請求**：寫入前 `seal()`，解密只發生在真正要呼叫模型的那一刻，任何回應都只回尾四碼。
- 不要把金鑰、密文或解密後的值寫進 log，連 debug 層級都不行。

## Serverless 的前提

- **模組層級不得在 import 時連資料庫或發網路請求**。連線與 client 惰性建立（`useDb()` 的 cached 模式）。
- 模組層級的可變狀態（如金鑰池的輪替游標）只在單一實例內有效，不能拿來做跨請求的計數、配額或去重。要跨實例一致就得進資料庫。
- 逾時是硬上限：單次請求塞不完的工作拆成背景任務或 cron，不要在使用者的請求裡硬跑。

## Drizzle 與 migration

- schema 一律改 `server/db/schema.ts`，再 `pnpm db:generate` 產 migration；**不手寫 migration SQL、也不手改產出的檔案**。
- 併發下會撞唯一約束的寫入要顯式處理：等價結果用 `onConflictDoNothing()`，需要覆蓋用 `onConflictDoUpdate()`，不要靠 try／catch 兜。
- 時間欄位一律 `timestamp(..., { withTimezone: true })`，不存 naive datetime。
