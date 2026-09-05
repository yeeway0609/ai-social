---
id: TASK-020
title: 全面改名為 butong-tone：repo、Vercel、程式識別碼與文件
status: To Do
assignee: []
created_date: '2026-09-05 18:28'
updated_date: '2026-09-05 18:49'
labels:
  - tech-debt
  - frontend
  - backend
dependencies: []
priority: high
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
產品名「不痛 Tone」已定，但機器識別碼仍是 ai-social。原本 CONTEXT.md 的決定是識別碼不跟著改名，現改為全面改成 butong-tone，包含 GitHub repo、Vercel project、package.json name、session cookie 名稱，以及所有文件引用。cookie 改名會讓既有登入者一律登出一次，demo 前要先做完並請隊員重新登入。。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GitHub repo 改名為 yeeway0609/butong-tone，本機與隊員 remote 更新（git remote set-url origin git@github.com:yeeway0609/butong-tone.git）
- [x] #2 Vercel project 改名為 butong-tone，Git 連結指向新 repo，production 網址改為 butong-tone-alex-sus-projects.vercel.app 且健康檢查 200
- [x] #3 package.json name 改為 butong-tone；server/utils/session.ts 的 COOKIE 改為 butong-tone-session
- [x] #4 README 線上 Demo 連結、docs/DEPLOYMENT.md、CONTEXT.md 識別碼表全部改為新名，CONTEXT.md 移除「識別碼維持 ai-social」的說明；git grep ai-social 只剩 Neon resource ai-social-db（Marketplace 資源不可改名）與歷史 backlog 紀錄
- [x] #5 補一則 decision 記錄推翻「識別碼不跟產品改名」的原決策與登出影響
- [ ] #6 繳交表單的 repo 與作品展示網址改填新網址
- [x] #7 所有文件裡的舊網址一併改掉：README、docs/、CONTEXT.md、backlog/docs 的 PRD 內凡是 ai-social-*.vercel.app 或 github.com/yeeway0609/ai-social 的連結全部換成新網址（backlog/tasks 與 backlog/decisions 的歷史紀錄不改）；完成後 git grep 'ai-social.*vercel.app' 與 'github.com/yeeway0609/ai-social' 在這些路徑下應無結果
<!-- AC:END -->
