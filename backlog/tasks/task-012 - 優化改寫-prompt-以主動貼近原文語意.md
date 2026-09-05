---
id: TASK-012
title: 優化改寫 prompt 以主動貼近原文語意
status: Done
assignee:
  - '@codex'
created_date: '2026-09-05 12:04'
updated_date: '2026-09-05 12:06'
labels: []
dependencies: []
modified_files:
  - server/utils/ai/prompt.ts
  - tests/outputValidation.test.mjs
  - backlog/docs/ai-social/doc-002 - 語氣改寫引擎-PRD.md
  - docs/AI_RENDER_CONTRACT.md
  - docs/SEMANTIC_SIMILARITY_CALIBRATION.md
  - AI_STYLE_ENGINE_DEVELOPMENT_PLAN.md
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
使用者希望不要只靠生成後的語意相似度篩選，而是在提示詞階段就引導模型盡量貼近原文。前一版已加入 80% 門檻，這次要補最小改寫、輸出前自檢、保留否定與因果等策略。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 共用 prompt 包含最小改寫原則，要求優先保留原句資訊順序與句意結構
- [x] #2 共用 prompt 要求輸出前內部自檢，但最終只輸出改寫文字
- [x] #3 共用 prompt 明確要求保留否定、程度、條件、時間順序、因果與不確定語氣
- [x] #4 相關測試與格式檢查通過
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 在 buildSystemPrompt() 的共用區塊加入改寫策略：最小改寫、保留原句資訊順序與句意結構。

2. 補上輸出前內部自檢、保留否定／程度／條件／時間順序／因果／不確定語氣，以及風格衝突時降低強度。

3. 更新測試與文件中已過期的門檻敘述，執行相關測試與格式檢查。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已在共用 prompt 加入最小改寫、資訊順序與句意結構保留、否定／程度／條件／時間順序／因果／不確定語氣保留，以及輸出前內部自檢但不輸出檢查過程。驗證通過：node --test tests/renderContract.test.mjs tests/semanticSimilarity.test.mjs tests/outputValidation.test.mjs tests/semanticSimilarityCalibration.test.mjs，21 個測試通過；git diff --check 通過。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已優化共用改寫 prompt，讓模型在生成階段主動貼近原文：採最小改寫、保留原句資訊順序與句意結構、保留否定與因果等高風險語意線索，並要求輸出前內部自檢。已同步 PRD、改寫契約、語意相似度校準文件與開發計畫，並以相關 Node 測試與 git diff --check 驗證。
<!-- SECTION:FINAL_SUMMARY:END -->
