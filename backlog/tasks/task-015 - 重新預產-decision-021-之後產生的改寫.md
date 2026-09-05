---
id: TASK-015
title: 重新預產 decision-021 之後產生的改寫
status: To Do
assignee: []
created_date: '2026-09-05 17:50'
labels:
  - backend
dependencies:
  - TASK-014
documentation:
  - doc-002
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
decision-023 修好提示詞與守門後，資料庫裡 2026-09-05 16:01（UTC 08:01）之後產生的 renditions 仍是壞的（轉述、你我反轉、範例句洩漏），讀者看到的不會自動更新。需要刪除那批改寫並用管理端點分批重跑，再抽查分析報告 2.1 貼文 b0d8f4c5 與 2.2 對話 a104a998 的案例。刪除是不可逆操作，要先備份或確認範圍。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 created_at 晚於 2026-09-05 08:01+00 的 renditions 已刪除（或全刪）
- [ ] #2 POST /api/admin/prerender 以 limit 50 分批跑到回傳 0
- [ ] #3 報告 2.1 與 2.2 列出的錯誤案例人工抽查全部修正，未修正的記回任務
- [ ] #4 Vercel Preview 的 NUXT_AI_TEMPERATURE 已改為 0.3 或移除
<!-- AC:END -->
