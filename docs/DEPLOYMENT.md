# 部署

單一 Vercel project：repo root 就是 Nuxt app，前端與 `server/` 的 API 一起 build、一起部署。資料庫是透過 Vercel Marketplace 開的 Neon（resource `ai-social-db`）。

本檔只記錄**設定檔裡看不出來的判斷**；環境變數清單看 `.env.example`，分支對應看 CLAUDE.md。

## 為什麼 region 是 iad1

`vercel.json` 把 function 釘在 `iad1`（華盛頓）看起來很怪——使用者在台灣。但 **Marketplace 開的 Neon 不能選 region**，我們這個落在 `aws-us-east-1`，所以是 function 去配合 DB。

改成 `hnd1` 會讓每次查詢都多一趟跨太平洋來回，比使用者到 edge 的那一段貴得多。真要搬去東京，得先改用個人 Neon 帳號自己開 project 指定 `ap-northeast-1`，兩邊一起搬才有意義。
