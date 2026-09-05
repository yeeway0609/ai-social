# AI 語氣改寫 MVP 開發路徑

本文件依目前 AI Social 程式碼與使用者於 2026 年 9 月 5 日確認的方向整理。本文保留開發路徑與驗收狀態；已實作項目以「目前實作進度」標示，尚未驗收項目仍明列。

## 已確認的方向

- 移除匿名使用功能，產品功能必須登入；登入入口、健康檢查等必要公開端點除外。
- 支援 `anthropic` 與 `openai`，沿用既有供應商轉接與金鑰解析。
- 使用者自備金鑰優先，沒有自備金鑰時使用團隊共用池。
- 需要生成但沒有可用金鑰時，顯示原文，並提示「未設定金鑰」、引導設定。
- 固定語氣清單定案為 `gentle_friendly`、`objective_neutral`、`clear_concise` 三種；有效改寫結果寫入資料庫，供同語氣讀者重用。
- 自訂語氣結果不寫入平台資料庫，只暫存在用戶端；後端僅在請求處理期間持有生成內容。
- 原文不列為語氣選項，仍作為改寫失敗的顯示內容及查看原文的來源。使用者回報同伴已修改選項，整合時再核對最新程式。
- 規劃改寫幅度計算並顯示於前端，供使用者參考。
- 是否回傳供應商與金鑰來源資訊暫不處理，不在本次強制增加回應欄位。

## 現有架構與設定

- `app/`：Nuxt 4／Vue 前端，已有 Feed、貼文、登入、設定與聊天頁面。
- `server/api/`：已有登入／登出、Feed、貼文、留言、聊天、原文、改寫與金鑰管理端點。
- `server/db/`：Drizzle 與 Neon HTTP driver；schema 已有使用者、金鑰、貼文、留言、讚、對話、訊息與 `renditions`。
- `server/utils/session.ts`：Cookie 簽章與 `requireUserId()`；登入流程已接上，但共用 API guard 尚未驗證帳號是否仍存在。
- `server/utils/ai/providers.ts`：既有 `RewriteFn`、`REWRITE_FNS` 與 `modelFor()`。
- `server/utils/ai/credentials.ts`：既有 `resolveCredential()`、`resolveViewerCredential()`、`NoCredentialError`。
- `shared/utils/ai.ts`：既有 `AI_PROVIDERS`、`AiProvider`、`CredentialSource`。
- `nuxt.config.ts`：私有 `runtimeConfig.ai`，預設供應商為 `anthropic`。
- 單一 Vercel project 同時部署前端與後端，function region 為 `iad1`，資料庫為 Neon；沿用現有部署配置。
- 使用 `pnpm`；`openai`、`@anthropic-ai/sdk`、`zod` 已在依賴中，不重複安裝。不預先加入尚無用途的 `tsx`。

## 開發順序

### 1. 盤點與同伴前置工作追蹤

步驟 1 已於同步 GitHub 後重新完成靜態盤點。核對日期為 2026 年 9 月 5 日，已執行 `git fetch origin` 並切換至追蹤 `origin/dev` 的本機 `dev`；兩者提交皆為 [`9a79b7a65090ff3f92ebbcbebf9df24a9d080807`](https://github.com/yeeway0609/ai-social/tree/9a79b7a65090ff3f92ebbcbebf9df24a9d080807)。三份本機未追蹤文件已保留，同步前備份位於 `/private/tmp/ai-social-sync-backup/`。本次未修改功能程式碼、執行資料庫操作或模型呼叫。

以下結果由同步後的本機程式重新核對。後續步驟需依本節銜接既有 Feed 與改寫引擎；已確認的產品方向維持不變。

| 對應盤點項目 | 同步後程式證據 | 結果與尚待驗收 |
|---|---|---|
| 15 | `server/db/schema.ts` 已有 `posts`，欄位為 `id`、`authorId`、`originalText`、`createdAt`；`POST /api/posts` 儲存正式原文；`loadContent()` 按 ID 從資料庫取原文 | 程式已具備；資料庫實際套用及真實資料讀寫待驗收 |
| 16 | `GET /api/posts` → `listPosts()`；首頁透過 `usePostFeed()` 呼叫；已有 `PostCard` 與改寫佇列 | 程式已具備；瀏覽器載入、分頁與錯誤流程待驗收 |
| 17 | 已有登入／登出端點、`auth.global.ts`、`requireUserId()`；`canView()` 限制私人訊息只供對話雙方存取，貼文與留言全站可見 | 部分完成；共用 API 登入檢查未確認使用者仍存在，無效使用者的舊簽章 Cookie 仍需處理；真實登入與權限待驗收 |

#### 正式資料與 API 邊界

- `server/utils/posts.ts` 的 `listPosts()` 以 `createdAt`、`id` 倒序查詢，每頁 20 筆，回傳 `{ items, nextCursor }`。
- Feed 只直接回傳自己的 `originalText`；他人內容的此欄位為 `null`。回退原文不能假設 Feed 已提供原文。
- `POST /api/render` 目前接收單筆 `{ kind, id }`，先驗證登入及 `canView()`，再呼叫 `renderContent()`。語氣與自訂指示取自資料庫中的讀者設定，瀏覽器不提交原文或語氣。
- `renderContent()` 經 `loadContent()` 取得正式原文，回傳 `{ kind, id, text, isOriginal, scale, source, error }`；失敗回應可以直接帶原文。
- `GET /api/original` 是查看原文的獨立入口，驗證登入與可讀權限後從資料庫取原文，不呼叫模型。
- `getCurrentUser()` 可查詢使用者是否存在，但 `requireUserId()` 本身只驗證簽章；`GET /api/posts` 未再呼叫有效使用者查詢。因此尚不能把「有效使用者驗證」標為完成。
- 前端 `useRenditionQueue()` 目前以多個單筆請求排隊呼叫 `/api/render`，不是計畫中的 1–6 筆批次端點。

#### 後續銜接差異

以下只記錄事實，不自動改變使用者已確認的產品方向，也未於步驟 1 修改程式：

1. 固定語氣已在內容寫入後預產，讀取缺少快取時惰性生成，結果存於 `renditions`；不必重新建立相同功能。
2. 自訂指示以 `instructionHash` 區分，現有 `renderContent()` 仍會呼叫 `writeCache()` 入庫，與「自訂結果只留用戶端」不同，後續須調整。
3. `server/utils/ai/scale.ts` 的三級 `RewriteScale` 仍保留為改寫幅度標籤；語意相似度已改用 embedding cosine similarity，欄位與前端呈現已銜接。
4. 供應商值域目前為 `anthropic`、`openai`、`openrouter`、`local`；生成流程沿用既有供應商轉接與錯誤分類，不再另建平行 provider 設定。
5. 固定語氣共用定義已位於 `shared/utils/tones.ts`，值域為 `gentle_friendly`、`objective_neutral`、`clear_concise`；沒有原文選項。自訂指示上限為 300，現行引擎只在自備金鑰存在時套用，需在契約銜接時明確處理。
6. 單筆 ID、讀者設定取語氣的既有契約，與計畫批次及瀏覽器提交語氣的描述不同；步驟 2 應先沿用現有邊界再規劃必要擴充。
7. `ContentBody.vue` 會把生成錯誤碼顯示成未改寫原因；缺金鑰、金鑰驗證失敗與額度受限會觸發對應的全域金鑰提示。設定成功、重試與真實瀏覽器流程仍待端到端驗收。
8. `GET /api/me` 會拒絕已刪除帳號，但 `GET /api/posts` 等只經 `requireUserId()` 的 API 沒有同等檢查；前端登入導向不能取代後端檢查。
9. 前端改寫佇列同時最多 3 個單筆請求，貼文長度上限為 `MAX_TEXT_LENGTH = 500`；與批次上限是不同維度，契約整合不可混用。
10. `ContentBody.vue` 在請求直接失敗時顯示「（載入失敗）」並標為原文，沒有取得真正原文；與服務端正常回傳失敗結果的原文回退是不同路徑，後續錯誤處理需補驗收。

本次為靜態原始碼核對，不代表遠端資料庫、部署或真實金鑰驗收完成。`backlog` CLI 仍不可用，未修改 Backlog 任務檔。遠端 `dev` 已同步，可據此進入下一步契約整理；後續仍須核對產品計畫與同伴新增介面的差異。

### 2. 凍結契約並沿用現有命名

已完成共用契約定義與離線邊界驗證，完整說明見 `docs/AI_RENDER_CONTRACT.md`。批次端點及 embedding 的資料庫／前端整合仍屬後續工作。

- 單筆 `POST /api/render` 沿用既有 `{ kind, id }` 請求；`RenditionResult` 已增加 `semanticSimilarity`。批次擴充定義 `RenderBatchRequest`、`RenderBatchItem`、`RenderBatchResult`，版本為 `rendition-batch-v1`。
- 前端只提交 `items: [{ kind, id }]`，不提交原文、讀者、語氣或自訂指示；語氣與自訂指示由登入者資料庫設定取得。
- 單批 1–6 筆，按 `kind` 與小寫 UUID 組合去重。原文從資料庫取得，非空且最多 500 個 UTF-16 code unit，與現有 Zod `.max()` 一致；自訂指示沿用最多 300 的現有設定。
- 共用純驗證位於 `shared/utils/renderContract.ts`。後續新增 HTTP 端點仍須以 Zod 驗證 body；有效登入、可讀權限與不存在內容在模型呼叫前處理。
- 結果維持請求順序並沿用 `text`、`isOriginal`、`error` 表達結果。生成失敗回應帶正式原文，不改成 `text: null`，因 Feed 不一定持有他人原文。
- 新的生成驗證與供應商錯誤代碼已接上單筆與批次生成流程；前端會顯示對應未改寫原因。
- `semanticSimilarity` 使用共享 `SemanticSimilarityResult`；成功包含原始分數、模型、算法版本，評估失敗與生成失敗分離，舊結果或未評估使用 `null`。
- 沿用現有四種供應商與 `RewriteFn` 全部參數，正式原文 `originalText` 映射至 `original`，不建立另一套 `style`／`styleKey` 命名。
- 批次由服務端逐篇協調並組合 JSON，並非模型原生 Structured Outputs。原生輸出需求保留於後續能力核對，不宣稱本步已完成。

契約、embedding 與輸出驗證已有離線測試；未呼叫真實模型。2026 年 9 月 5 日重新安裝依賴時被 pnpm 最低發布時間政策阻擋，完整本機 lint／typecheck／build 仍需在依賴安裝完成後重跑。

### 3. 沿用依賴與 Nuxt 環境變數

沿用 `.env.example` 與 `runtimeConfig`：

```dotenv
DATABASE_URL=
NUXT_SESSION_SECRET=
NUXT_PUBLIC_ENVIRONMENT=local
NUXT_AI_DEFAULT_PROVIDER=anthropic
NUXT_AI_POOL_ANTHROPIC=
NUXT_AI_POOL_OPENAI=
NUXT_AI_MODEL_ANTHROPIC=claude-haiku-4-5-20251001
NUXT_AI_MODEL_OPENAI=gpt-5-mini
```

模型名稱以最新 `nuxt.config.ts`／部署設定為準。共用池為逗號分隔的金鑰清單；自備金鑰只存在使用者瀏覽器，每次請求以標頭送入伺服器，用完即丟。

不新增平行的 `OPENAI_API_KEY`、`OPENAI_MODEL` 設定。金鑰不得放入 `runtimeConfig.public`、瀏覽器或 Git。

已核對 2026 年 9 月 5 日工作樹：`package.json` 已使用 `pnpm`，`openai` 與 `zod` 已存在；`.env.example` 與 `nuxt.config.ts` 已沿用 `NUXT_AI_*`，且保留 `anthropic`、`openai`、`openrouter`、`local` 四種供應商設定。本步未新增 `OPENAI_API_KEY` 或 `OPENAI_MODEL`。

### 4. 擴充既有 AI 目錄

沿用 `server/utils/ai/`，不另建 `src/ai/`。

- 保留 `providers.ts` 的雙供應商轉接、`REWRITE_FNS` 與 `modelFor()`。
- 保留 `credentials.ts` 的自備優先與共用池輪替規則；受保護 API 必須先確認登入，不允許匿名進入解析與生成流程。
- 新增的契約驗證、語氣提示、批次協調、輸出檢查與改寫幅度計算放在既有 AI 目錄；目前輸出檢查位於 `server/utils/ai/outputValidation.ts`，批次協調入口為 `renderContentBatch()`。
- 前後端共享且不含機密的語氣與結果型別放在 `shared/`，先核對同伴已新增的定義。
- 個別貼文失敗不使其餘貼文的結果遺失。

### 5. 輸出驗證與原文回退

- 每篇輸出必須對應原請求 ID，不得混淆、新增或遺漏貼文；`renderContentBatch()` 會在組合結果後呼叫 `validateRenderResultIdentities()`。
- 已檢查非空、輸出長度、網址、數字、百分比、金額、標籤與帳號提及的保留。
- 一般人名辨識仍未實作；日期目前以數字 token 規則覆蓋常見格式，但尚未有完整日期 parser。
- 供應商錯誤或驗證失敗時回傳該篇失敗，前端顯示原文，不將失敗輸出寫入資料庫；生成後會先通過 `validateRenditionText()` 才寫入 `renditions`。
- 需要生成但 `resolveCredential()` 回傳 `null` 時，回傳 `no_ai_credential`，顯示原文與設定提示。
- 已設定但無效或額度耗盡的金鑰屬供應商錯誤，不誤報為未設定；`classifyProviderError()` 目前分成 `provider_authentication_failed` 與 `provider_rate_limited`。

### 6. 固定語氣入庫與自訂語氣用戶端暫存

固定語氣的有效改寫寫入資料庫，後續請求直接讀取；自訂語氣結果只暫存在用戶端。任何改寫都不得覆寫原文。

目前實作進度：`renderContent()` 已改為只有純預設語氣才讀寫 `renditions`；帶自訂指示時會生成並回傳，但不寫入平台資料庫。`useRenditionQueue()` 已加入以設定世代為 key 的用戶端記憶體暫存，切換語氣或自訂指示後會清空。此設計已同步更新 `CONTEXT.md` 與語氣改寫引擎 PRD；尚缺一則正式 Backlog decision，因本機 `backlog` CLI 目前無法執行。

建議的儲存整合方案，待貼文 schema 完成後確認：

- 使用詞彙表中的 `renditions` 概念，記錄貼文、固定語氣、原文版本或摘要、語氣規則版本、改寫結果及改寫幅度。
- 以貼文、語氣與版本建立唯一性，避免並發生成造成重複資料；原文或語氣規則更新後不可讀取舊版本當作有效結果。
- MVP 建議首次請求缺少有效版本時生成並寫入，後續直接讀取；若同伴採發文時預先生成，再於整合時確認生成時機。
- 先驗證登入與貼文存取權，再讀取固定版本；命中有效版本不需要模型金鑰，也不呼叫模型。
- 缺少有效版本才解析金鑰並生成。寫入失敗與模型失敗分別處理，不宣稱未成功儲存的結果已入庫。
- 自訂結果建議先採用戶端記憶體暫存，以貼文版本與自訂描述區分，登出或切換使用者清除；不寫資料庫、伺服器持久快取或生成內容日誌。IndexedDB 是否需要可之後再決定。

### 7. 改寫幅度計算與前端顯示

目前實作進度：已新增獨立計算模組 `server/utils/ai/semanticSimilarity.ts`，使用 OpenAI embedding HTTP API，預設 `text-embedding-3-small`，可由呼叫端指定模型。生成流程已在輸出驗證通過後呼叫 embedding 評估；評估失敗不使改寫失敗。`RenditionResult` 已增加 `semanticSimilarity`，前端 `ContentBody.vue` 已顯示分數或暫不可用。`renditions` schema 已增加語意相似度欄位，且已產生 migration；真實資料庫尚未套用，舊資料會回傳 `semanticSimilarity: null`。尚未以真實金鑰驗收或校準繁體中文。


已選擇方案 4：語意向量相似度。以同一 embedding 模型將正式原文與改寫結果轉為向量，再計算 cosine similarity，作為語意接近程度的參考。

```text
similarity = dot(originalEmbedding, renditionEmbedding)
             / (norm(originalEmbedding) × norm(renditionEmbedding))
```

- 此指標衡量語意接近程度，不衡量改字數量或語氣強弱，也不保證事實、否定與立場完全一致；既有精確資料驗證仍保留。
- 不直接把 `1 − similarity` 換算為「意思改變百分比」，也不把相似度稱為「原意保留百分比」。前端文案採「語意相似度」，顯示為百分比到小數第一位。
- 後端在改寫輸出驗證通過後評估；兩家生成供應商的結果使用同一 embedding 模型與版本，以利比較。
- embedding 的供應商、繁體中文適用模型、金鑰來源、費用與逾時設定尚待選定。現有 RewriteFn 與金鑰解析不代表已支援 embedding，不假定生成金鑰可直接用於評估；依模型選擇另行規劃整合。
- 固定語氣將評估分數及評估模型／版本隨結果入庫，讀取有效版本不重新呼叫評估；自訂語氣的分數隨結果回傳，只在用戶端暫存，不持久儲存自訂結果或其向量。
- 不需要向量資料庫。是否儲存固定原文向量以節省重複評估，另行評估；本次不預設新增向量儲存。
- 建議評估逾時或失敗時保留已通過輸出驗證的改寫，分數為空並顯示「語意相似度暫不可用」，不捏造分數；此降級行為待實作契約確認。
- 以繁體中文人工標註案例校準：相同文字、同義改述、純語氣調整、否定翻轉、數字改動、刪除重要資訊及無關內容。已補本地校準樣本與排序測試；尚未用真實 embedding 金鑰跑實測前，不設定通用高低門檻，也不使用分數作為唯一放行依據。
- 驗證空文字、零向量、非有限值與維度不一致；無效輸出不進入評估。更換 embedding 模型或前處理版本後，不直接混用舊分數。
- 方法參考：[Sentence Transformers 語意相似度說明](https://www.sbert.net/docs/sentence_transformer/usage/semantic_textual_similarity.html)。目前已完成本地實作與離線樣本；尚未呼叫真實 embedding API。

### 8. API 與前端整合

目前實作進度：已新增 `POST /api/render/batch`，前端 `useRenditionQueue()` 會把佇列湊成最多 6 筆批次；單筆 `/api/render` 保留。兩個 render API 都已補有效帳號檢查。

已完成：

1. API 驗證登入、有效使用者、批次及貼文存取權。
2. 從資料庫讀取正式原文，優先取用有效固定語氣版本。
3. 需要生成時沿用 `resolveCredential()`、`modelFor()` 與 `REWRITE_FNS`。
4. 驗證輸出、計算改寫幅度，固定語氣成功結果入庫，自訂結果僅回傳。
5. 前端呈現語氣選擇、自訂輸入、Loading、查看原文、改寫幅度與語意相似度；不把原文列為語氣選項。
6. 無金鑰時顯示原文與設定引導，設定完成可由使用者重試；避免持續自動重試。

尚未完成：真實瀏覽器與資料庫端到端驗收、真實資料庫 migration 套用。基本 rate limit 已以每個 serverless 實例的記憶體視窗先接上，之後若需要跨實例精準限制再換成資料庫或外部儲存。

### 9. 檢查與驗收

執行既有 `pnpm lint`、`pnpm typecheck`；部署前執行 `pnpm build`。至少涵蓋以下固定案例，OpenAI 與 Anthropic 都需驗證生成與失敗處理：

- 未登入、無效 session、已失效使用者不能存取受保護功能。
- 無權讀取的貼文不能讀取既有改寫或生成新改寫。
- 自備優先、共用池後備、無金鑰提示與設定後重試。
- 已入庫的固定語氣版本在沒有金鑰時仍可讀取。
- 固定語氣首次生成入庫、後續命中、原文更新失效及並發唯一性。
- 自訂語氣不入庫，用戶端暫存隔離與清除。
- 溫和友善保留負面批評，客觀中立不新增主張，清楚簡潔不刪除重要資訊。
- 原文內 Prompt injection、多篇 ID 對應、網址、數字、日期、金額、標籤與人名保留。
- 模型錯誤、無效輸出、超長輸入、重複 ID 與部分失敗。
- 語意相似度的繁體中文校準案例、兩家生成結果使用相同評估模型、評估失敗顯示及模型版本隔離；不將分數誤解為語意正確率。
- 原文不在語氣選項，但可以查看，失敗時正確回退。

### 10. 部署與交接

依 `CLAUDE.md` 在 `dev` 開發，沿用 Vercel Preview／Production 與 Neon 設定。確認環境變數、資料表部署、lint／typecheck／build、錯誤日誌與 README 整合說明。最後重新核對步驟 1 的三項同伴前置工作，不將等待項目視為已完成。

## 範圍與完成條件

固定語氣入庫、自訂語氣用戶端暫存、雙供應商、登入限制、無金鑰引導及改寫幅度均屬本次規劃。暫不加入本地模型、Fine-tuning、第二個 LLM Judge、向量資料庫、額外自動多模型路由、Redis、串流、Agent、Tool Calling、多語言或影音。

- 同伴前置功能完成並回頭核對，後端取得正式原文且落實存取權。
- 單批 1–6 篇，每篇最多 500 字，兩家供應商使用同一套服務端結果驗證。
- 固定語氣成功結果可入庫並重用，自訂語氣不入庫。
- 無金鑰顯示原文與設定提示，其他生成失敗不破壞 Feed。
- 改寫幅度計算與前端說明完成，原文不是語氣選項。
- 既有 CI 檢查、建置與上述固定案例通過。

## 追蹤紀錄

- 登入限制：[GitHub issue #1](https://github.com/yeeway0609/ai-social/issues/1)。
- 無金鑰原文回退與設定提示：[GitHub issue #2](https://github.com/yeeway0609/ai-social/issues/2)。
- `backlog` CLI 可透過 Codex runtime 的 Node 路徑搭配 `pnpm dlx backlog.md` 執行；一般 shell 仍未設定全域 `backlog` 指令。
- 2026 年 9 月 5 日已補 decision-017 與 decision-018，同步預設語氣與語意相似度持久化決策。
