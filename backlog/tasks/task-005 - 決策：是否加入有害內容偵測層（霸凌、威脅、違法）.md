---
id: TASK-005
title: 決策：是否加入有害內容偵測層（霸凌、威脅、違法）
status: Done
assignee: []
created_date: '2026-09-04 18:10'
updated_date: '2026-09-05 03:13'
labels:
  - spec
  - backend
dependencies: []
documentation:
  - doc-002
priority: low
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
產品願景包含網路霸凌、兒少保護、犯罪防治。v1 只靠讀者端的語氣改寫達成（加害內容抵達讀者時已被緩和）。待決是否加一層偵測：

- (a) 不做，只靠改寫。
- (b) 改寫時讓模型順帶輸出一個結構化欄位，標出「含攻擊／威脅／違法內容」，讀者端顯示警示或摺疊。成本低（同一次呼叫），但要設計 UI、閾值與誤判處置。

研究依據：Rathje 等人（2021）指出敵意擴散主因是「針對外團體」而非情緒字眼，只換語氣可能仍保留攻擊結構，這是支持 (b) 的論據。Jigsaw Perspective API 已宣布停止服務，不宜作依賴。目前傾向 v1 選 (a)、(b) 列第二階段。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 拍板 v1 是否包含偵測層，建立 decision
- [x] #2 若做，補進語氣改寫引擎 PRD 的服務契約（新增輸出欄位）與社群內容 PRD 的貼文卡呈現
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已拍板，見 decision-014；結論整合回 doc-002。
<!-- SECTION:NOTES:END -->
