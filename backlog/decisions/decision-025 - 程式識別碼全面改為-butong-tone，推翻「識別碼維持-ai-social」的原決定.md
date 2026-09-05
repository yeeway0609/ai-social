---
id: decision-025
title: 程式識別碼全面改為 butong-tone，推翻「識別碼維持 ai-social」的原決定
date: '2026-09-06 02:40'
status: accepted
---
## Context

> PRD：AI Social 總覽（doc-001）

產品改名為「不痛 Tone」時，CONTEXT.md 決定程式識別碼維持 ai-social：理由是它只出現在機器看的地方，改 session cookie 名稱會讓既有登入狀態失效。repo 即將在黑客松繳交時公開，GitHub repo、Vercel project、package.json 都叫 ai-social，跟產品名對不起來，評審從 repo 名找不到作品。

## Decision

- GitHub repo 改為 yeeway0609/butong-tone，Vercel project 改為 butong-tone，production 網址隨之變為 butong-tone-alex-sus-projects.vercel.app。
- package.json 的 name 改為 butong-tone；session cookie 由 ai-social-session 改為 butong-tone-session。
- Neon 資源 ai-social-db 是 Vercel Marketplace 建立的，無法改名，是唯一保留舊名的地方。
- 文件（README、CONTEXT.md、docs/）的識別碼與網址一併更新；backlog 的歷史 task 與 decision 不改。

## Consequences

- cookie 改名部署後，所有人會被登出一次，需重新登入；demo 前完成並通知隊員。
- GitHub 舊網址自動轉址，隊員的 clone 不會立刻壞，但建議更新 remote。
- 舊 production 網址 ai-social-alex-sus-projects.vercel.app 失效，繳交表單與任何對外連結要填新網址。
