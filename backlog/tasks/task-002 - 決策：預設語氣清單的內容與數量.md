---
id: TASK-002
title: 決策：預設語氣清單的內容與數量
status: Done
assignee:
  - '@codex'
created_date: '2026-09-04 18:10'
updated_date: '2026-09-05 07:59'
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
- [x] #1 清單、每個語氣的名稱與一句描述定案，寫進語氣改寫引擎 PRD 的語氣設定章節
- [x] #2 沒有「不改寫」選項，讀者一定選一種會呼叫模型的語氣（見 decision-015）
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 將預設語氣清單定案為 gentle_friendly、objective_neutral、clear_concise 三種。
2. 更新語氣改寫引擎 PRD 的語氣設定章節，移除舊的五種候選描述。
3. 補上決策紀錄，說明 demo 與快取成本考量下改採三種中性可控語氣。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
使用者已拍板三個預設語氣：gentle and friendly、objective and neutral、clear and concise。

驗證：doc-002 的語氣設定章節列出 gentle_friendly、objective_neutral、clear_concise 三種；decision-015 維持沒有不改寫選項，decision-017 記錄三種語氣定案。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
預設語氣已定案為三種中性可控選項，並同步至語氣改寫引擎 PRD 與 accepted decision；沒有不改寫選項的設計由既有 decision-015 與本次 decision-017 共同支撐。
<!-- SECTION:FINAL_SUMMARY:END -->
