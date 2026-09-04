---
id: TASK-006
title: 語音朗讀：以讀者語氣朗讀他人內容（第二階段）
status: To Do
assignee: []
created_date: '2026-09-04 18:10'
labels:
  - feature
  - backend
  - frontend
dependencies: []
documentation:
  - doc-001
priority: low
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
他人貼文、留言、訊息可點擊朗讀，朗讀的文字是讀者語氣的改寫版而非原文。使用 ElevenLabs，金鑰沿用現有「自備金鑰優先、其次共用池」機制，新增一個供應商。屬第二階段，demo 核心功能完成後才做。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 他人內容有朗讀按鈕，播放的是該讀者當下看到的改寫文字
- [ ] #2 自己的內容朗讀原文
- [ ] #3 ElevenLabs 金鑰可在設定頁自備，無金鑰時按鈕停用並提示
<!-- AC:END -->
