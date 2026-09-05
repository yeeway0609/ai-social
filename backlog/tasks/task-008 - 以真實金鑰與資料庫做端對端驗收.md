---
id: TASK-008
title: 以真實金鑰與資料庫做端對端驗收
status: To Do
assignee: []
created_date: '2026-09-04 18:28'
updated_date: '2026-09-05 03:41'
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
- 既有 users 表沒有 password 欄位，若表內已有資料，db:push 加 NOT NULL 欄位會失敗：先清空 users（會連帶清掉 ai_credentials），再 db:push、db:seed。
- .env 新增 NUXT_AI_MOCK；沒有金鑰時設 true 可先走 UI 流程。

## 需要人眼確認的實作判斷
- 改寫幅度三檔的閾值（Dice 相似度 0.75／0.4）是估的，看實際分布調整。
- 預設語氣清單暫用五個候選（TASK-002），prompt 文字在 shared/utils/tones.ts。
- 登入 username 一律小寫比對。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 兩個帳號登入、完成引導設定後，同一則貼文在兩支手機顯示不同語氣，作者自己看到原文
- [ ] #2 共用池金鑰移除後，feed 退回原文並顯示金鑰提示；填入自備金鑰後恢復改寫
- [ ] #3 留言、讚、刪除貼文、個人頁、聊天輪詢與樂觀送出皆可操作
- [ ] #4 貼文內容含「忽略以上指示」類文字時改寫結果仍是語氣改寫
<!-- AC:END -->
