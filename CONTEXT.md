# 領域詞彙表

本檔定義每個領域概念的正式名稱、對應的程式碼識別碼，以及該避免的同義詞。命名、文件與註解的用詞以本檔為準。

## 產品名稱

正式名稱是 **不痛 Tone**（「不痛」＋「Tone」，讀起來像「不痛痛」），視覺意象是**安全帽**：戴上它，別人的話砸下來就不痛。品牌標誌在 `app/components/BrandLogo.vue`，favicon 在 `public/favicon.svg`。

程式識別碼維持 `ai-social`，不跟著改名——它只出現在機器看的地方，改了只會讓既有登入狀態失效：

| 位置 | 值 |
|---|---|
| `package.json` 的 `name` | `ai-social` |
| `nuxt.config.ts` 的 `colorMode.storageKey` | `ai-social-color-mode` |
| `server/utils/session.ts` 的 `COOKIE` | `ai-social-session` |
| GitHub repo | `yeeway0609/ai-social` |
| Vercel project | `ai-social` |
| Neon resource | `ai-social-db` |

使用者看得到的地方（頁首、登入頁、瀏覽器分頁標題、`README.md`、`CLAUDE.md`、backlog 的 `project_name`）一律寫「不痛 Tone」，中英之間留一個半形空格。

## 核心概念

### 原文（original）

作者實際寫下的字。**唯一的事實來源**，任何改寫都不回寫它。

- 識別碼：`originalText`、`posts.original_text`、`comments.original_text`、`messages.original_text`
- 避免：「本文」（易與「內文」混淆）、「raw」、「source」

### 語氣（tone）

讀者選擇的呈現風格。這是本平台取代「介面語言」的那個設定——使用者切的不是語言，是語氣。

- 識別碼：`tone`、`Tone`、`users.tone`
- 值域定義在 `shared/utils/tones.ts`，全部都是會呼叫模型的語氣；沒有「不改寫」這種選項，讀者一定選其中一種。`users.tone` 為 null 只代表尚未完成引導設定
- 「原文」不是語氣，是存在資料庫裡的事實（見下方「原文」）；讀者要看原文走「顯示原文」，不是切語氣
- 避免：「風格」「濾鏡」「模式」——`filter` 與 `mode` 在程式碼裡另有含義；「不改寫」「original 語氣」

### 改寫（rendition）

一則內容（貼文、留言、訊息）在某個語氣下的 AI 產出結果。寫入時對每個語氣預產並存進資料庫、全站共用；讀取時直接撈，不再呼叫模型。

- 識別碼：`renditions` 資料表、`Rendition`、`ContentSummary.rendition`、`pregenerateRenditions()`、`lookupRendition()`
- 避免：「翻譯」（會誤導成語言轉換）、「潤稿」（暗示原文有瑕疵）、「版本」（`revision` 另指編輯歷史，本專案沒有這概念）

### 改寫幅度

一則改寫相對原文被改動了多少，顯示在貼文上讓讀者知道自己看到的離原話有多遠。

- 識別碼：`RewriteScale`、`scale`，既有字元差異分級。
- 不與「語意相似度」混用，兩者衡量的對象與方向不同。

### 語意相似度

原文與改寫文字的 embedding 向量接近程度。分數越高表示越接近；前端可顯示為 `XX.X%`，但這只是 cosine similarity 的百分比格式，不代表事實正確率、原意保留百分比或語氣變化大小。

- 識別碼：`SemanticSimilarityResult`、`semanticSimilarity`、`measureSemanticSimilarity()`。
- 避免：「改寫百分比」「原意保留率」。

### 使用者名稱（username）

登入用的唯一識別字串，也是個人頁網址與 @ 前綴顯示的那一段。一律小寫比對。

- 識別碼：`username`、`users.username`、路由 `/users/[username]`
- 避免：「handle」（曾用過，已全面改名）、「帳號」（那是整個 user 實體，不是這個欄位）、「暱稱」（那是 `displayName`）

## 模型與金鑰

### 改寫模型（rewrite model）

平台統一使用的模型：NVIDIA NIM 提供的 Nemotron 3.5 Lightning，走 OpenAI 相容端點。金鑰只放伺服器環境變數，所有使用者共用；使用者不填、也看不到金鑰。

- 識別碼：`rewrite()`（`server/utils/ai/nvidia.ts`）、環境變數 `NUXT_AI_NVIDIA_API_KEY`／`NUXT_AI_MODEL`／`NUXT_AI_EMBEDDING_MODEL`／`NUXT_AI_TEMPERATURE`
- 避免：「供應商」「provider」（已不再多家並存）、「自備金鑰」「共用池」（已移除的舊機制）

### 預產中（rendition pending）

內容剛寫入、背景預產可能還沒跑完的狀態：改寫尚不存在且寫入未滿 60 秒。前端顯示骨架並輪詢；超過等待期仍沒有改寫就視為預產失敗，顯示原文。

- 識別碼：`isRenditionPending`、`RENDITION_PENDING_WINDOW_MS`、`/api/renditions`
- 避免：「載入中」（那是網路請求狀態，不是改寫尚未產出）

### 引導設定（onboarding）

首次登入時強制完成的語氣設定流程；完成與否以 `users.onboarded_at` 是否有值判定。

- 識別碼：`onboarding`、`onboardedAt`
- 避免：「新手教學」（不是教學，是必填設定）

### 顯示原文（reveal original）

讀者對單一則他人內容一次性切回原文的動作，不改全站語氣設定、不呼叫模型。

- 識別碼：`revealOriginal`
- 避免：「關閉改寫」（那聽起來像全站設定）

## 內容物件

| 概念 | 識別碼 | 說明 | 避免 |
|---|---|---|---|
| 貼文 | `post`、`posts` | 動態牆上的一則純文字內容 | 「文章」「動態」 |
| 留言 | `comment`、`comments` | 掛在貼文下的一層回應 | 「回覆」（保留給日後樓中樓）、「評論」 |
| 讚 | `like`、`likes` | 對貼文的一人一讚 | 「喜歡」「愛心」 |
| 對話 | `conversation`、`conversations` | 兩位使用者之間唯一的 1：1 聊天 | 「聊天室」（指整個功能分頁，不指單一對話）、「房間」 |
| 訊息 | `message`、`messages` | 對話內的一則純文字 | 「私訊」（指功能，不指單則） |
| 內容類型 | `ContentKind`：`post`／`comment`／`message` | 改寫服務用來區分要改寫哪種內容 | 「target type」 |
