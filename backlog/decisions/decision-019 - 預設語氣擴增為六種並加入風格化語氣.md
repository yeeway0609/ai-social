---
id: decision-019
title: 預設語氣擴增為六種並加入風格化語氣
date: '2026-09-05 10:31'
status: accepted
---
> PRD：語氣改寫引擎 PRD（doc-002）

## Context

decision-017 將預設語氣先收斂為三種中性可控選項，方便 demo 前降低成本與解釋負擔。後續使用者希望加入更有辨識度的風格，讓讀者能看到更明顯的語氣差異與社交趣味。

## Decision

- 預設語氣從三種擴增為六種。
- 保留原三種：`gentle_friendly`、`objective_neutral`、`clear_concise`。
- 新增三種：`literary`（文青風）、`huangshanliao`（黃山料體）、`caige`（財哥體）。
- 新增語氣仍然不得作為「不改寫」選項，且 prompt 必須保留原文事實、數字、人物、立場與結論。

## Consequences

- 預設語氣預產與快取目標增加，新增語氣對既有內容需要重新預產才會命中快取。
- 風格化語氣更容易產生語意飄移，因此輸出驗證、語意相似度與人工抽樣更重要。
- 若風格名稱或語感需要微調，只更新 `shared/utils/tones.ts` 與 PRD，不新增資料庫欄位。
