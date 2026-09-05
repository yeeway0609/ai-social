---
id: TASK-017
title: 評估把七種語氣拆成忠實組與風格組兩次呼叫
status: To Do
assignee: []
created_date: '2026-09-05 17:50'
labels:
  - backend
  - tech-debt
dependencies: []
documentation:
  - doc-002
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
目前七種語氣一次呼叫、一個 JSON 輸出，風格化語氣的指令會汙染溫和友善、客觀中立、清楚簡潔這三個中性語氣，長輸出後段品質也下降。分析報告 S6 建議至少拆成忠實組（三種中性）與風格組（其餘四種）並行呼叫；代價是每則內容的請求數翻倍，要對照四把金鑰的每分鐘額度與 doc-002 3.4「一則內容只打一次模型」的既有設計。這會推翻 decision-011／019 的部分理由，要先量測再決定。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 用同一批原文比較單次呼叫與兩組呼叫的中性語氣品質（人稱、覆蓋、捏造），結果記在任務
- [ ] #2 估算拆開後的 RPM 用量是否在金鑰額度內
- [ ] #3 若採用，出 decision 並更新 doc-002 3.4 第 2 條；若不採用，記錄理由後關閉
<!-- AC:END -->
