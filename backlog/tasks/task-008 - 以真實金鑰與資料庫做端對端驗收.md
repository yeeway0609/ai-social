---
id: TASK-008
title: 以真實金鑰與資料庫做端對端驗收
status: In Progress
assignee:
  - '@codex'
created_date: '2026-09-04 18:28'
updated_date: '2026-09-05 08:08'
labels:
  - backend
  - frontend
dependencies: []
documentation:
  - doc-001
priority: high
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
實作時沒有模型金鑰也沒有可連的資料庫，所有程式只過了 lint、typecheck 與 build。demo 前要在 Preview 或本機以真實環境走完一輪。

## 已知要先處理
- 既有 users 表沒有 password 欄位，若表內已有資料，db:push 加 NOT NULL 欄位會失敗：先清空 users（會連帶清掉關聯資料），再 db:push、db:seed。
- .env 需要 NUXT_AI_NVIDIA_API_KEY（build.nvidia.com）；沒有金鑰時把 NUXT_AI_MOCK 設 true 可先走 UI 流程。
- schema 拿掉了 users.custom_instruction 與 renditions.instruction_hash：跑 db:push（或 db:migrate 依序套用 0000、0001）。

## 需要人眼確認的實作判斷
- 改寫幅度三檔的閾值（Dice 相似度 0.75／0.4）是估的，看實際分布調整。
- 預設語氣三種（decision-017），prompt 文字在 shared/utils/tones.ts。
- 登入 username 一律小寫比對。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 兩個帳號登入、完成引導設定後，同一則貼文在兩支手機顯示不同語氣，作者自己看到原文
- [ ] #2 留言、讚、刪除貼文、個人頁、聊天輪詢與樂觀送出皆可操作
- [ ] #3 貼文內容含「忽略以上指示」類文字時改寫結果仍是語氣改寫
- [ ] #4 發文後幾秒內，另一支手機的動態牆從骨架換成該語氣的改寫；管理端點 /api/admin/prerender 可把既有內容補齊三個語氣
- [ ] #5 移除 NUXT_AI_NVIDIA_API_KEY 後，新貼文超過等待期顯示原文並標「原文」；設回金鑰並重跑管理端點後恢復改寫
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 清理 package.json 內已無實體檔案且未被其他地方呼叫的殘留 script。
2. 下載依賴並確認本機檢查可執行；若 supply-chain policy 擋住，回報具體阻塞。
3. 在可取得 DATABASE_URL 後執行 server/db/migrations/0000_add_rendition_semantic_similarity.sql 套用真實資料庫。
4. 提升改寫錯誤碼在前端的顯示精準度，讓金鑰、額度、供應商與模型輸出問題可被區分。
5. 同步 backlog 規格與決策紀錄，讓語氣選項與語意相似度狀態反映目前實作。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已確認 prerender 與 db:seed-renditions 只剩 package.json script 入口，沒有其他呼叫點；prerender.ts 曾在 0653b76 被上游刪除，script 入口殘留。

依賴下載重試結果：pnpm install --frozen-lockfile 下載了部分套件，但 43 個 lockfile entries 違反 minimumReleaseAge policy；後續 lint/typecheck 又因 registry ENOTFOUND 進入補裝重試，已中止。node_modules/.bin 尚未建立。真實資料庫套用結果：本機沒有 .env，shell 沒有 DATABASE_URL，且沒有 psql；目前無可用 DB 連線，未套用 migration。

可執行的純 Node 驗證通過：node --test tests/renderContract.test.mjs tests/semanticSimilarity.test.mjs tests/outputValidation.test.mjs tests/semanticSimilarityCalibration.test.mjs，共 19 項通過。

GitHub Actions 驗證通過：CI run 33954134974 於 dev 上完成，pnpm install --frozen-lockfile、pnpm lint、pnpm typecheck 皆通過。
<!-- SECTION:NOTES:END -->
