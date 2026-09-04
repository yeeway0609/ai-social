---
id: decision-005
title: 聊天室用短輪詢而非 WebSocket
date: '2026-09-04 18:10'
status: accepted
---
> PRD：聊天室 PRD（doc-004）

## Context

部署平台的 serverless 函式無狀態且有執行時間上限，無法維持 WebSocket 長連線；要即時得引入第三方服務（Pusher、Ably、Supabase Realtime），對一場 demo 不划算。

## Decision

對話頁以 3 秒短輪詢拉新訊息，以最後一則訊息為游標；離開頁面即停止。不使用 WebSocket 或第三方即時服務。

## Consequences

- 訊息延遲最多約 3 秒，加上改寫時間；demo 可接受。
- 不做已讀、未讀、輸入中等需要即時推送的狀態。
- 若日後要即時，換成第三方推送只影響對話頁的資料取得方式，不影響訊息模型。
