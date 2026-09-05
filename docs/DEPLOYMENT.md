# 部署

單一 Vercel project：repo root 就是 Nuxt app，前端與 `server/` 的 API 一起 build、一起部署。資料庫是透過 Vercel Marketplace 開的 Neon（resource `ai-social-db`）。

本檔只記錄**設定檔裡看不出來的判斷**；環境變數清單看 `.env.example`，分支對應看 CLAUDE.md。

## 為什麼 region 是 iad1

`vercel.json` 把 function 釘在 `iad1`（華盛頓）看起來很怪——使用者在台灣。但 **Marketplace 開的 Neon 不能選 region**，我們這個落在 `aws-us-east-1`，所以是 function 去配合 DB。

改成 `hnd1` 會讓每次查詢都多一趟跨太平洋來回，比使用者到 edge 的那一段貴得多。真要搬去東京，得先改用個人 Neon 帳號自己開 project 指定 `ap-northeast-1`，兩邊一起搬才有意義。

## 資料庫 migration 怎麼跑

Vercel build 不跑 migration，CI 也沒有；schema 變更一律由開發者在本機對 Neon 執行，執行前先在群組講一聲，避免兩個人同時動。

1. 拿連線字串：`vercel env pull .env`（Preview 與本機共用同一個 Neon branch）。`.env` 已在 `.gitignore`，不要貼進 issue 或聊天。
2. 套用：
   - 日常快速改動用 `pnpm db:push`。它會互動式詢問要不要刪欄位，**必須在真正的終端機跑**，在 agent 或 CI 這種沒有 TTY 的環境會直接報錯。
   - 需要留紀錄的變更改用 `pnpm db:generate` 產生 `server/db/migrations/NNNN_*.sql`，再 `pnpm db:migrate`。已在 repo 的 migration 一律寫成可重複執行（`IF EXISTS`／`IF NOT EXISTS`），重跑不會壞。
   - 沒有 TTY 又只是要套既有 migration 檔時，可以用 Neon driver 直接執行該 SQL 檔的每一句，效果相同。
3. 驗證：`pnpm db:studio` 或直接查 `information_schema.columns`，確認欄位與 `server/db/schema.ts` 一致；再開 Preview 打一次 `/api/posts`，schema 不一致時 Drizzle 會在這裡 500。
4. 失敗處理：migration 每一句都是獨立的 DDL，中途失敗就修正後重跑即可（都是 idempotent）。需要回退時手寫反向 DDL 執行，不依賴 drizzle-kit 的回退功能。demo 資料可重建，真的搞壞就 `db:push` 後 `db:seed` 重來。
