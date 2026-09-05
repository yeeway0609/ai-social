---
id: TASK-011
title: 加入語氣共通不變量與語意相似度門檻
status: Done
assignee:
  - '@codex'
created_date: '2026-09-05 11:22'
updated_date: '2026-09-05 11:29'
labels: []
dependencies: []
modified_files:
  - server/utils/ai/prompt.ts
  - server/utils/ai/outputValidation.ts
  - server/utils/ai/render.ts
  - shared/types/api.ts
  - app/components/ContentBody.vue
  - tests/outputValidation.test.mjs
  - backlog/docs/ai-social/doc-002 - 語氣改寫引擎-PRD.md
  - docs/AI_RENDER_CONTRACT.md
  - docs/SEMANTIC_SIMILARITY.md
  - AI_STYLE_ENGINE_DEVELOPMENT_PLAN.md
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
使用者要求所有預設語氣共用同一組限制：不可曲解原文立場、不可修改客觀事實、數字、人物等，且語意相似度需要高於 80%。目前系統已計算語意相似度，但尚未把 80% 作為生成結果採用門檻。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 所有語氣生成 prompt 都套用共同限制，不需在每個語氣 instruction 重複維護
- [x] #2 真實生成結果只有在語意相似度可用且高於 80% 時才採用，否則退回原文並提供明確錯誤碼
- [x] #3 語氣改寫引擎 PRD 與相關語意相似度文件同步目前門檻規則
- [x] #4 相關測試與格式檢查通過
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 將語氣共同限制集中到 prompt 共用區塊，明確要求不曲解立場、不修改事實、數字與人物，並要求語意相似度至少 80%。

2. 在生成流程加入語意相似度採用門檻；分數不可用或低於門檻時退回原文並回傳明確錯誤碼。

3. 更新 API 型別、PRD 與語意相似度文件，補測試並執行相關檢查。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已加入共通 prompt 不變量與語意相似度採用門檻；生成結果分數不可用回 semantic_similarity_unavailable，分數不高於 80% 回 semantic_similarity_too_low，兩者都退回原文且不寫入快取。

驗證通過：node --test tests/renderContract.test.mjs tests/semanticSimilarity.test.mjs tests/outputValidation.test.mjs tests/semanticSimilarityCalibration.test.mjs，21 個測試通過；git diff --check 通過。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已加入所有語氣共用的 prompt 絕對規則，明確限制不可曲解立場、不可修改客觀事實、數字、人物、時間、地點與結論，並要求語意相似度高於 80%。生成流程現在會在 embedding 評估後套用門檻，分數不可用或不高於 80% 都回原文並給明確錯誤碼；已同步 API 型別、前端錯誤文案、PRD 與語意相似度文件。
<!-- SECTION:FINAL_SUMMARY:END -->
