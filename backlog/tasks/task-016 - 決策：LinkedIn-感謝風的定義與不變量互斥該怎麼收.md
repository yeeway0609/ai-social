---
id: TASK-016
title: 決策：LinkedIn 感謝風的定義與不變量互斥該怎麼收
status: To Do
assignee: []
created_date: '2026-09-05 17:50'
labels:
  - spec
  - backend
dependencies: []
documentation:
  - doc-002
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
LinkedIn 感謝風要求「真誠感謝、強調收穫與價值」，不變量又不准新增原文沒有的感謝對象、收穫與大家；實測模型只能捏造（「也謝謝同事們的互動，讓我學會……」、把抱怨太陽下等兩小時改成「很開心能在戶外享受陽光」）。兩個選項：改定義為「只能把既有的正面成分講得更正向，負面事實仍是負面，不得出現原文沒有的感謝對象、收穫、大家」；或接受它是娛樂彩蛋並在產品文案標明。這是產品決策，拍板後出 decision 並更新 doc-002 與 shared/utils/tones.ts 的 instruction。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 有一則 accepted 的 decision 記錄選項與理由
- [ ] #2 doc-002 的語氣清單與 tones.ts 的 instruction 同步更新
- [ ] #3 報告 2.2 中 LinkedIn 感謝風的情緒反轉案例在新定義下不再產生
<!-- AC:END -->
