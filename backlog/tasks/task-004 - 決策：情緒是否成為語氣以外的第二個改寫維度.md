---
id: TASK-004
title: 決策：情緒是否成為語氣以外的第二個改寫維度
status: Done
assignee: []
created_date: '2026-09-04 18:10'
updated_date: '2026-09-05 03:13'
labels:
  - spec
  - backend
dependencies: []
documentation:
  - doc-002
priority: medium
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
除了語氣（風格），情緒也可能是可調的維度，例如「保留原情緒／緩和負面情緒／中性化」三檔。兩個選項：

1. 情緒獨立成第二個設定維度，與語氣正交。好處是「兒少保護模式」可直接定義為「溫和語氣＋緩和負面情緒」，不需另做功能；壞處是引導設定多一步、prompt 多一段。
2. 情緒只內含在預設語氣清單裡（例如「溫和」本身就含緩和），不另設維度。

研究依據：Ferrara 與 Yang（2015）發現正向情緒比負向更容易被複製，所以若做情緒維度，「緩和負面」比「強推正向」划算。目前傾向選項 1。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 拍板是否新增情緒維度及其值域，建立 decision 並更新語氣改寫引擎 PRD 的語氣設定與流程圖
- [x] #2 若採用，引導設定頁的問題項目同步更新到總覽 PRD
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已拍板，見 decision-013；結論整合回 doc-002。
<!-- SECTION:NOTES:END -->
