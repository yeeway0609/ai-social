# 不痛 Tone

社群平台的「語氣層」：貼文以原話存下，每位讀者自己選要用什麼語氣看到它。

## 比賽資訊

[BUILDMODE GEN-AI HACKATHON 2026](https://hackathon2026.sitcon.org/)｜FUTUREMODE × SITCON2026

- 時間：2026.09.04–06
- 地點：台北花博爭艷館

## 本機開發

```bash
cp .env.example .env      # 填入 Neon 連線字串與 NVIDIA API 金鑰（build.nvidia.com）
pnpm install
pnpm db:push              # 把 schema 推到 Neon 的 dev branch
pnpm db:seed              # 預建 demo 帳號（複製 scripts/seed-users.example.json 為 seed-users.json 後改名單）
pnpm dev                  # http://localhost:3000
```

沒有模型金鑰時把 `.env` 的 `NUXT_AI_MOCK` 設為 `true`，改寫會退化成在原文前加語氣標記，整個流程照樣能走。

`pnpm db:push` 直接同步 schema、不留 migration 檔，適合早期快速改動；schema 定案後改用
`pnpm db:generate` ＋ `pnpm db:migrate`。

## 結構

| 路徑 | 內容 |
|---|---|
| `app/` | Vue 前端（Nuxt 4，pages／components／composables） |
| `server/api/` | HTTP 端點 |
| `scripts/` | 預建帳號等一次性腳本 |
| `server/utils/ai/` | 寫入時預產改寫、NVIDIA NIM 模型呼叫、輸出驗證與語意相似度 |
| `server/db/` | Drizzle schema 與連線 |
| `shared/` | 前後端共用的值域（語氣清單、內容類型） |
| `backlog/` | 任務、PRD 與決策紀錄 |

## 部署

Vercel（零設定，root 即 Nuxt app）＋ Neon Postgres。細節見 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。
