---
id: TASK-019
title: 聊天列表顯示未讀訊息數量
status: In Progress
assignee: []
created_date: '2026-09-05 17:30'
updated_date: '2026-09-05 17:36'
labels:
  - frontend
  - backend
  - feature
dependencies: []
priority: high
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
聊天列表目前只有頭像、名稱與最後一則訊息預覽，缺少未讀提示，看起來像聯絡人列表而不是聊天室。加入每個對話的未讀數量：以每位使用者在每個對話的最後閱讀時間為基準，計算對方在此之後送出的訊息數；進入對話頁（含輪詢）即視為讀到最新。PRD 原本把已讀／未讀列為不做，這次改為只做未讀數量，不做對方已讀回條與輸入中狀態。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 聊天列表每列在有未讀時顯示粉紅圓形徽章與數字，名稱與預覽加粗；無未讀時不顯示
- [x] #2 進入對話頁後回到列表，該對話未讀歸零
- [x] #3 對方送出新訊息後，重新載入列表能看到未讀數增加
- [x] #4 資料庫新增每人每對話的最後閱讀時間，migration 可重複執行
- [x] #5 doc-004 聊天室 PRD 更新需求與非目標，並補一則 decision
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已在 feature/chat-unread 實作，未 commit 待 review。新增 conversation_reads 表（migration 0002 已套到 Neon）；listConversations 一次查出各對話未讀數；messages GET 端點順手把閱讀時間推到現在；列表顯示粉紅徽章與加粗。已用 kevin 帳號打 /api/conversations 驗證 unreadCount 正確。PRD doc-004 與 decision-024 已更新。
<!-- SECTION:NOTES:END -->
