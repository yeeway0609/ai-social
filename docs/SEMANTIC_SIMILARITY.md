# Embedding 語意相似度

`server/utils/ai/semanticSimilarity.ts` 提供獨立的 `measureSemanticSimilarity()` 計算模組。原文與改寫以同一模型、同一請求取得向量，再依回應索引配對計算 cosine similarity。

## 呼叫與金鑰

呼叫端提供 `originalText`、`rewrittenText` 與 OpenAI `apiKey`，可指定 `model`、`timeoutMs`。預設模型為 `text-embedding-3-small`，預設逾時為 5000 毫秒，不自動重試。模型可設定不等同已完成繁體中文校準。

整合時須先驗證登入與內容存取權，從資料庫取得正式原文。金鑰依既有 `resolveCredential(viewerId, 'openai')` 取得自備或共用池金鑰；不能把 Anthropic 或其他生成供應商的金鑰直接交給 embedding API。模組不自行查詢資料庫或金鑰，也不讀取新的環境變數。

## 結果

成功回傳 `status: 'ok'`、原始 `score`、API 回報的 `model` 與 `version: 'cosine-nfc-v1'`。分數範圍為 −1 至 1，越高表示向量越接近；前端顯示為百分比到小數第一位（`XX.X%`），但不稱為「意思改變百分比」或「原意保留率」，也不套用舊 Dice 的分級門檻。

失敗回傳 `status: 'unavailable'`、`score: null` 與分類錯誤碼，區分輸入錯誤、無金鑰、驗證失敗、限流、逾時、供應商錯誤與無效向量。整合時評估失敗不應丟棄已成功生成的改寫。此模組不回傳或記錄金鑰、原文、向量與原始錯誤訊息。

比較前統一 Unicode NFC 與換行，不刪除標點或否定詞。向量計算拒絕空向量、零向量、維度不符及非有限值，縮放後正規化以避免數值溢位。

## 驗證與整合狀態

使用 Node.js 22.18 以上或 24 執行：

```bash
node --test tests/semanticSimilarity.test.mjs
```

測試使用人工向量與模擬 HTTP 回應，不發送真實貼文、不耗用模型額度。它驗證計算與錯誤處理，不代表繁體中文語意品質已驗收。

目前已完成計算模組並接上生成流程。有效改寫會在輸出驗證通過後評估；評估失敗不讓改寫失敗，而是回傳 `semanticSimilarity: { status: 'unavailable', score: null, error }`。預設語氣的結果會把分數／模型／版本或評估錯誤寫入 `renditions`，自訂結果與分數只回傳給用戶端暫存。已建立本地繁體中文校準樣本與排序測試，真實 embedding 金鑰實測仍未完成，不可把舊 `scale` 字串直接當成 embedding 分數。

驗證紀錄：繁中校準樣本涵蓋相同文字、同義改述、純語氣調整、否定翻轉、數字改動、刪除重要資訊及無關內容；離線測試使用人工向量驗證排序，不耗用真實金鑰。2026 年 9 月 5 日重新下載依賴時仍被 pnpm 最低發布時間政策阻擋，`node_modules/.bin` 未建立，因此本機完整 lint／typecheck／build 尚未完成。

API 參考：[OpenAI Embeddings](https://developers.openai.com/api/reference/resources/embeddings/methods/create)、[模型說明](https://developers.openai.com/api/docs/models/text-embedding-3-small)。
