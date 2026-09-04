---
id: TASK-003
title: 決策：自訂語氣指示與預設語氣的組合方式及其邊界
status: To Do
assignee: []
created_date: '2026-09-04 18:10'
labels:
  - spec
  - backend
dependencies: []
documentation:
  - doc-002
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
讀者可填一段自由文字的自訂語氣指示。兩個相關問題要與隊友一起拍板。

## 組合方式
- (a) 二選一：選預設就不能寫自訂，寫自訂就不套預設。prompt 單純、不會互相矛盾、預設語氣可共用快取。
- (b) 疊加：預設為底、自訂指示加在上面。表達力強，但兩段指示可能衝突，且每位讀者的組合都不同，無法共用快取。
- 目前傾向 (b)（產品負責人偏好），PRD 暫依 (b) 撰寫。

## 邊界
自訂指示若寫「幫我摘要」「把所有人的話改成罵我」「把數字都改掉」，會違反改寫不變量（不增刪事實、不摘要、不加評論、不改立場）。待決：系統不變量是否永遠優先、違規指示是靜默忽略還是在設定時就拒絕存檔並提示。目前傾向：不變量永遠優先、違規部分靜默忽略，因為「顯示原文」的信任基礎建立在改寫不會失真。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 選定組合方式，建立 accepted decision 並更新語氣改寫引擎 PRD
- [ ] #2 明訂自訂指示與不變量衝突時的處置，寫進 PRD 改寫不變量章節
<!-- AC:END -->
