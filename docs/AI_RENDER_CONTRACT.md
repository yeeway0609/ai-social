# 改寫整合契約

版本：`rendition-batch-v1`。共用型別、純驗證、批次 HTTP 端點、embedding 結果入庫欄位與前端批次佇列皆已建立；真實資料庫 migration 與真實金鑰端到端驗收尚未完成。

## 現有入口與批次擴充

`POST /api/render` 維持單筆 `RenderRequest`，只接收 `{ kind, id }`，回傳既有 `RenditionResult`。語氣、`customInstruction` 與使用者皆由登入者設定取得。現有使用者設定端點維持 `tone` 與最長 300 的 `customInstruction`，固定語氣以 `shared/utils/tones.ts` 為準，原文不列為選項。

批次請求採 `RenderBatchRequest`：

```json
{
  "items": [
    { "kind": "post", "id": "12345678-1234-4123-8123-123456789abc" }
  ]
}
```

- 每批 1–6 筆，`kind` 沿用 `post`、`comment`、`message`。
- UUID 使用標準版本 1–8 格式，正規化為小寫；以 `kind` 與 UUID 組合判斷重複，避免跨內容表誤判。
- 不接受額外欄位，包括原文、使用者、語氣、自訂指示、供應商與金鑰。批次純驗證入口為 `parseRenderBatchRequest()`。
- 新增 HTTP 端點時仍以 Zod 驗證 body，再共用批次語意檢查；本次沒有取代現有單筆端點的 Zod schema。
- 先驗證有效登入者與所有內容可讀權限，再從資料庫載入原文並呼叫模型。不存在或不可讀均回傳 404，不產生可用來探測私人內容的逐篇結果。
- 請求結構或重複 ID 失敗回傳 400，未登入或帳號已刪除回傳 401。這是批次整合要求，既有帳號檢查缺口仍由 issue #1 追蹤。

## 原文與模型邊界

`loadContent()` 從資料庫取得 `originalText`；`validateOriginalText()` 檢查非空及 `MAX_TEXT_LENGTH = 500`。字數沿用現有 Zod `.max()` 的 UTF-16 code unit 計數，emoji 可能占兩個以上單位。檢查不裁切或改寫資料庫原文。

呼叫既有 `REWRITE_FNS` 時映射至 `original`，沿用其 `apiKey`、`model`、`system`、`timeoutMs`、`baseUrl` 參數與 `Promise<string>` 結果。生成供應商沿用目前四種值域，不移除同伴新增的 OpenRouter 或地端模型。

批次是服務端協調多筆單篇工作，不要求模型自行回傳或辨識多個內容 ID。模型原生 Structured Outputs 尚待各供應商能力核對，不能以服務端 JSON 回應視為已完成。

## 回應

`RenderBatchResult` 包含固定 `version` 與依請求順序排列的 `items`。單筆 `RenditionResult` 與每筆 `RenderBatchItem` 都沿用現有 `kind`、`id`、`text`、`isOriginal`、`scale`、`source`、`error`，並增加 `semanticSimilarity`。

- 生成成功：`isOriginal: false`、`error: null`、`text` 為非空改寫。
- 自己的內容或無語氣設定：`isOriginal: true`、`error: null`、`text` 為正式原文。
- 單篇生成失敗：`isOriginal: true`、`error` 為錯誤碼、`text` 為正式原文，其他篇仍可成功。
- 原文回退時 `scale`、`semanticSimilarity` 皆為 `null`。成功改寫也不必有舊 `scale`，embedding 分數不得推導成舊三級標籤。
- `source` 沿用現有行為，本次不擴充金鑰來源顯示需求。
- `validateRenderResultIdentities()` 驗證結果筆數及順序一致，拒絕遺失、新增、交換或重複。服務端負責內容與結果對應；不得依模型完成順序配回前端。

生成錯誤碼：

| 代碼 | 含義 |
|---|---|
| `no_ai_credential` | 未設定任何可用生成金鑰 |
| `provider_authentication_failed` | 已提供金鑰，但供應商拒絕驗證 |
| `provider_rate_limited` | 供應商限流或配額限制，不直接斷言未設定金鑰 |
| `provider_error` | 其他供應商錯誤 |
| `timeout` | 生成逾時 |
| `invalid_model_output` | 輸出結構或非空檢查未通過 |
| `token_changed` | 應精確保留的原文資料被更動 |
| `output_too_long` | 超過輸出長度規則 |

新增代碼已接上服務端生成流程；單筆端點與批次協調層都會沿用同一組回退結果。輸出驗證目前涵蓋非空、長度上限、網址、數字、百分比、金額、標籤與帳號提及；一般人名辨識仍未實作，不能宣稱已完整保留所有實體名稱。

前端會把生成錯誤碼顯示成「未改寫：原因」標籤；缺金鑰、金鑰驗證失敗與額度受限會另外顯示對應的全域金鑰提示，引導使用者前往設定頁處理。

## Embedding 結果

共用定義位於 `shared/types/semanticSimilarity.ts`，不從前端匯入伺服器計算模組。

```json
{
  "status": "ok",
  "score": 0.86,
  "model": "text-embedding-3-small",
  "version": "cosine-nfc-v1"
}
```

- `score` 為 −1 至 1 的有限數值；0 是有效分數，不能當成缺值。
- 尚未評估、舊快取或原文回退使用 `semanticSimilarity: null`。
- 評估失敗使用 `{ status: 'unavailable', score: null, error }`；它不把已成功改寫變成生成失敗，生成層 `error` 仍可為 `null`。
- embedding 錯誤沿用 `SemanticSimilarityError`，與生成金鑰錯誤分離。
- 固定語氣的成功分數連同模型與版本入庫；自訂結果及分數只在用戶端暫存。

## 驗證

```bash
node --test tests/renderContract.test.mjs tests/semanticSimilarity.test.mjs tests/outputValidation.test.mjs tests/providerClassification.test.mjs
```

契約測試涵蓋批次上限、額外欄位、UUID、跨表識別、UTF-16 長度、結果配對、輸出驗證與 embedding 計算。這些測試不呼叫資料庫或模型，不代替 HTTP 權限與前端驗收。
