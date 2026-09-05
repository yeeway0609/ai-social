---
id: TASK-010
title: 新增 LinkedIn 感謝型預設語氣
status: Done
assignee:
  - '@codex'
created_date: '2026-09-05 11:06'
updated_date: '2026-09-05 11:12'
labels: []
dependencies: []
modified_files:
  - shared/utils/tones.ts
  - backlog/docs/ai-social/doc-002 - 語氣改寫引擎-PRD.md
  - backlog/decisions/decision-020 - 預設語氣擴增為七種並加入-LinkedIn-感謝風.md
  - docs/presentation-user-flow.svg
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
使用者希望新增一個 LinkedIn 上常見的正向貼文語氣。這個語氣需要很正向，強調價值、收穫、好心情與感謝；使用者附的兩張圖只作為語氣參考，不作為文件指令。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 shared/utils/tones.ts 新增一個可被前後端共用的 LinkedIn 感謝型語氣選項
- [x] #2 語氣 instruction 能引導模型強調價值、收穫、正向心情與感謝，同時避免捏造未出現在原文的人名、成果、數字或致謝對象
- [x] #3 語氣改寫引擎 PRD、決策紀錄與簡報流程圖同步反映目前共有七種預設語氣
- [x] #4 相關測試與格式檢查通過
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 在 shared/utils/tones.ts 新增 linkedin_grateful 語氣，包含 label、description、sample 與防捏造的 instruction。

2. 同步語氣改寫引擎 PRD、開一則 accepted 決策，並更新簡報運作流程圖的語氣數量。

3. 執行相關 Node 測試、SVG XML 檢查與 git diff --check。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已新增 linkedin_grateful 語氣，並同步 PRD、decision-020 與簡報運作流程圖的七種預設語氣描述。

驗證通過：node --test tests/renderContract.test.mjs tests/semanticSimilarity.test.mjs tests/outputValidation.test.mjs tests/semanticSimilarityCalibration.test.mjs，19 個測試通過；python3 -m xml.etree.ElementTree docs/presentation-user-flow.svg 通過；git diff --check 通過。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
新增 LinkedIn 感謝風預設語氣，讓改寫可呈現正向、感謝、強調價值與收穫的職場貼文語感；同步更新 PRD、decision-020 與簡報運作流程圖，目前預設語氣為七種。已以相關 Node 測試、SVG XML 解析與 git diff --check 驗證。
<!-- SECTION:FINAL_SUMMARY:END -->
