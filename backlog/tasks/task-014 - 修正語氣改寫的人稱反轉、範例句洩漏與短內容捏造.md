---
id: TASK-014
title: 修正語氣改寫的人稱反轉、範例句洩漏與短內容捏造
status: Done
assignee:
  - '@claude'
created_date: '2026-09-05 17:50'
updated_date: '2026-09-05 17:51'
labels:
  - backend
  - bug
dependencies: []
documentation:
  - doc-002
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
2026-09-06 的資料庫檢查發現 decision-021 之後的改寫大量轉述（「用戶表示」「提問者」）、你我反轉、對作者說話（「您」）、把純感嘆描述成「有重複的聲音」、抄提示詞範例句與「如果 A，那 B 就是 C」佔位句型、整段刪除，而且全部通過 0.5 的相似度門檻。根因與方案見 repo 外的 ai-social-AI-REWRITE-ANALYSIS.md；決策記在 decision-023。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 系統提示含保留人稱與視角、不得描述原文、段句數不少於原文三條規則，並依內容類型說明誰在說話（訊息的「你」是讀者）
- [x] #2 系統提示不再含任何語氣範例句；黃山料體與財哥體指示不含可抄寫的示範句或佔位字母
- [x] #3 輸出驗證新增人稱、覆蓋、洩漏、描述四項確定性守門，各有測試覆蓋報告中的實際錯誤案例
- [x] #4 純感嘆或不足四字的短內容不呼叫模型，所有語氣以原文落地且讀者不會先看到骨架
- [x] #5 相似度門檻 0.7、temperature 預設 0.3、top_p 0.9；PRD 與相關文件同步
- [x] #6 pnpm test、pnpm lint、pnpm typecheck 通過
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
提示詞改寫在 server/utils/ai/prompt.ts（buildSystemPrompt 多收 kind 與原文，動態帶入段句數）；量測共用 server/utils/ai/textShape.ts；四項守門與 0.7 門檻在 server/utils/ai/outputValidation.ts；短內容略過與 identity 列在 server/utils/ai/render.ts；解碼設定在 nvidia.ts、nuxt.config.ts、.env.example。測試 23 個通過，lint 與 typecheck 通過。尚未重新預產既有改寫，Vercel 的 NUXT_AI_TEMPERATURE 環境變數需手動改。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
依錯誤分析報告完成 S1 到 S5 與 S7：提示詞補人稱與視角規則並移除範例句、新增四項確定性輸出守門、短內容不改寫、門檻回 0.7、temperature 0.3。S6（拆呼叫）、S8（LinkedIn 感謝風定義）、S9（重新預產）、S10（評測集）另開任務。
<!-- SECTION:FINAL_SUMMARY:END -->
