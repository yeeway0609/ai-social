---
id: TASK-007
title: 貼文編輯（enhancement）
status: To Do
assignee: []
created_date: '2026-09-04 18:10'
labels:
  - feature
  - backend
  - frontend
dependencies: []
documentation:
  - doc-003
priority: low
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v1 貼文與留言只能刪除。若有餘裕，允許作者編輯自己的貼文：編輯即直接改原文，資料庫只存原文，所以既有的改寫全部作廢、讀者下次看到時重新改寫。不保留編輯歷史。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 作者可編輯自己的貼文正文，上限仍為 500 字
- [ ] #2 編輯後其他讀者看到的是新原文的改寫版
- [ ] #3 貼文卡顯示「已編輯」標記
<!-- AC:END -->
