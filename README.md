# AI Social

社群平台的「語氣層」：貼文以原話存下，每位讀者自己選要用什麼語氣看到它。

## 比賽資訊

[BUILDMODE GEN-AI HACKATHON 2026](https://hackathon2026.sitcon.org/)｜FUTUREMODE × SITCON2026

- 時間：2026.09.04–06
- 地點：台北花博爭艷館

## 本機開發

```bash
cp .env.example .env      # 填入 Neon 連線字串與金鑰
pnpm install
pnpm db:push              # 把 schema 推到 Neon 的 dev branch
pnpm dev                  # http://localhost:3000
```

`pnpm db:push` 直接同步 schema、不留 migration 檔，適合早期快速改動；schema 定案後改用
`pnpm db:generate` ＋ `pnpm db:migrate`。

## 結構

| 路徑 | 內容 |
|---|---|
| `app/` | Vue 前端（Nuxt 4，pages／components／composables） |
| `server/api/` | HTTP 端點 |
| `server/utils/ai/` | 語氣改寫、金鑰解析、各家模型轉接 |
| `server/db/` | Drizzle schema 與連線 |
| `shared/` | 前後端共用的值域（語氣清單、provider） |
| `backlog/` | 任務、PRD 與決策紀錄 |

## 部署

Vercel（零設定，root 即 Nuxt app）＋ Neon Postgres。細節見 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。
