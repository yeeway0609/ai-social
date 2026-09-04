# 領域詞彙表

本檔定義每個領域概念的正式名稱、對應的程式碼識別碼，以及該避免的同義詞。命名、文件與註解的用詞以本檔為準。

## 產品名稱（暫定）

正式名稱是 **AI Social**，識別碼一律 `ai-social`。

**這是佔位名稱，尚未定案。** 改名時要一起換掉的地方如下，repo 內外都有：

| 位置 | 現值 |
|---|---|
| `README.md` 標題、`CLAUDE.md` 標題 | AI Social |
| `app/pages/index.vue` 首頁標題 | AI Social |
| `package.json` 的 `name` | `ai-social` |
| `backlog/config.yml` 的 `project_name` | AI Social |
| `nuxt.config.ts` 的 `colorMode.storageKey` | `ai-social-color-mode` |
| `server/utils/session.ts` 的 `COOKIE` | `ai-social-session` |
| GitHub repo | `yeeway0609/ai-social` |
| Vercel project | `ai-social` |
| Neon resource | `ai-social-db` |

改 `storageKey` 與 `COOKIE` 會讓所有既有瀏覽器的偏好設定與登入狀態失效——正式上線後才改要當成一次登出事件處理，現在改沒有成本。

## 核心概念

### 原文（original）

作者實際寫下的字。**唯一的事實來源**，任何改寫都不回寫它。

- 識別碼：`originalText`、`posts.original_text`
- 避免：「本文」（易與「內文」混淆）、「raw」、「source」

### 語氣（tone）

讀者選擇的呈現風格。這是本平台取代「介面語言」的那個設定——使用者切的不是語言，是語氣。

- 識別碼：`tone`、`Tone`、`users.preferred_tone`
- 值域定義在 `shared/tones.ts`；`original` 是「不改寫」這個特例值，也算一種語氣選項
- 避免：「風格」「濾鏡」「模式」——`filter` 與 `mode` 在程式碼裡另有含義

### 改寫（rendition）

一則貼文在某個語氣下的 AI 產出結果。一則貼文對每種語氣各有一份改寫。

- 識別碼：`renditions` 資料表、`Rendition`、`renderPost()`
- 避免：「翻譯」（會誤導成語言轉換）、「潤稿」（暗示原文有瑕疵）、「版本」（`revision` 另指編輯歷史，本專案沒有這概念）

### 改寫幅度

一則改寫相對原文被改動了多少，顯示在貼文上讓讀者知道自己看到的離原話有多遠。

- 避免：「相似度」（方向相反，容易讀錯）

## 模型與金鑰

### 供應商（provider）

提供改寫模型的廠商。本平台不綁單一家。

- 識別碼：`AiProvider`、值域見 `shared/ai.ts`
- 避免：「vendor」、「廠商」不一致混用

### 自備金鑰（own credential）

使用者自己填入、加密存放的 API key。

- 識別碼：`aiCredentials` 資料表、`CredentialSource` 的 `own`
- 避免：「BYOK」（縮寫，非行業慣例到可直接使用的程度）

### 共用池（pool）

團隊提供、所有沒自備金鑰的使用者共享的金鑰集合。demo 現場可能耗盡。

- 識別碼：`CredentialSource` 的 `pool`、環境變數 `NUXT_AI_POOL_*`
- 避免：「額度」（指的是池裡的 token 數，不是池本身）
