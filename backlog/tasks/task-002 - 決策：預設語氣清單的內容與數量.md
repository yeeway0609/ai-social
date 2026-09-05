---
id: TASK-002
title: 決策：預設語氣清單的內容與數量
status: To Do
assignee: []
created_date: '2026-09-04 18:10'
updated_date: '2026-09-05 03:52'
labels:
  - spec
  - backend
dependencies: []
documentation:
  - doc-002
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
語氣改寫引擎的預設語氣值域尚未定案，要與隊友討論。清單越小，demo 的對比越鮮明、未來若做快取成本也越可控。

## 目前傾向
5 個預設：溫和體貼、直白犀利、幽默嘲諷、文青詩意、長輩 LINE 風。每個語氣需要一段給模型的風格描述與 1 個示例句，供引導設定頁展示。「不改寫」已依 decision-015 排除，不在清單內。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 清單、每個語氣的名稱與一句描述定案，寫進語氣改寫引擎 PRD 的語氣設定章節
- [ ] #2 沒有「不改寫」選項，讀者一定選一種會呼叫模型的語氣（見 decision-015）
<!-- AC:END -->
