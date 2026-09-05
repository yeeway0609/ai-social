---
id: TASK-018
title: 建立改寫評測集並在 demo 前必跑
status: To Do
assignee: []
created_date: '2026-09-05 17:50'
labels:
  - backend
dependencies:
  - TASK-014
documentation:
  - doc-002
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
目前沒有任何固定的評測集，每次改提示詞都靠事後翻資料庫發現問題。分析報告 S10 建議準備二十則原文，涵蓋第一人稱抱怨、含你我的私訊、感嘆詞、否定句、帶數字、帶台語，寫腳本打真實模型並用輸出驗證的守門自動評分，另外人工看人稱與立場。這份評測集同時是影片素材的來源：只用通過評測的案例拍攝。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 scripts/ 下有可重複執行的評測腳本，讀取固定的二十則原文並輸出七種語氣的通過率與失敗碼
- [ ] #2 評測集涵蓋報告列出的六類原文
- [ ] #3 docs/ 有一頁說明如何執行與判讀
<!-- AC:END -->
