---
id: TASK-009
title: 新增三種預設語氣風格
status: Done
assignee:
  - '@codex'
created_date: '2026-09-05 10:30'
updated_date: '2026-09-05 10:48'
labels: []
dependencies: []
documentation:
  - doc-002
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
使用者希望在既有預設語氣格式下新增文青風、黃山料體、財哥體。這會讓引導設定、設定頁與預產快取目標從三種擴為六種，也需要同步語氣改寫引擎 PRD 與新的決策脈絡。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 shared/utils/tones.ts 新增文青風、黃山料體、財哥體，並包含 id、label、description、sample、instruction
- [x] #2 新增語氣不包含原文選項，且 instruction 明確保留原文事實、立場、數字與人物
- [x] #3 語氣改寫引擎 PRD 與決策紀錄同步目前六種預設語氣
- [x] #4 相關靜態檢查或可執行測試通過
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 依 shared/utils/tones.ts 既有格式新增三個 tone。
2. 更新語氣改寫引擎 PRD，將預設語氣清單從三個改為六個。
3. 新增 accepted decision，記錄這次從三種中性語氣擴增為六種含風格化語氣。
4. 更新簡報運作流程圖的語氣數量文字。
5. 執行可用的靜態檢查或純 Node 測試。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已新增 literary、huangshanliao、caige 三個 Tone，皆包含 id、label、description、sample、instruction；instruction 均明確要求保留原文事實、數字、人物、立場與結論。

已更新 doc-002 預設語氣清單為六種，新增 decision-019 記錄本次擴增決策，並將簡報運作流程圖文字改為六種預設語氣。

驗證通過：node --test tests/renderContract.test.mjs tests/semanticSimilarity.test.mjs tests/outputValidation.test.mjs tests/semanticSimilarityCalibration.test.mjs 共 19 項通過；presentation-user-flow.svg XML 解析通過；git diff --check 通過。

依使用者補充加強 huangshanliao 與 caige：黃山料體改為短句、看似深刻但像廢話、大量換行留白；財哥體改為大量插入刪節號，讓連續文字每段盡量不超過三個中文字。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
新增文青風、黃山料體、財哥體三種預設語氣，並同步 PRD、決策與簡報流程圖；以純 Node 測試、SVG XML 檢查與 diff check 驗證。

後續依使用者補充加強黃山料體與財哥體：黃山料體改為短句、留白與似是而非金句；財哥體改為一行內用刪節號切分且每段不超過三字。再次驗證純 Node 測試 19 項與 diff check 通過。
<!-- SECTION:FINAL_SUMMARY:END -->
