# Embedding 語意相似度

`server/utils/ai/semanticSimilarity.ts` 提供獨立的 `measureSemanticSimilarity()` 計算模組。原文與改寫以同一模型、同一請求取得向量，再依回應索引配對計算 cosine similarity。

## 呼叫與金鑰

呼叫端提供 `originalText`、`rewrittenText`、`apiKey`、`model` 與 `embeddingsUrl`（OpenAI 相容的 embeddings 端點），可再指定 `timeoutMs`（預設 5000 毫秒，不自動重試）與 `extraBody`（端點專屬參數）。模組沒有內建任何端點或模型預設值，也不自行查詢資料庫或金鑰。

目前的整合走 NVIDIA NIM：端點 `https://integrate.api.nvidia.com/v1/embeddings`、模型由 `NUXT_AI_EMBEDDING_MODEL` 決定（預設 `nvidia/nemotron-3-embed-1b`）、金鑰與改寫模型共用 `NUXT_AI_NVIDIA_API_KEY`，並帶 `input_type: passage`。評估只在寫入時預產改寫的流程裡發生，讀取路徑不重算。

## 結果

成功回傳 `status: 'ok'`、原始 `score`、API 回報的 `model` 與 `version: 'cosine-nfc-v1'`。分數範圍為 −1 至 1，越高表示向量越接近；前端在貼文頁顯示為百分比到小數第一位（`XX.X%`），但不稱為「意思改變百分比」或「原意保留率」，也不套用改寫幅度的分級門檻。

失敗回傳 `status: 'unavailable'`、`score: null` 與分類錯誤碼，區分輸入錯誤、無金鑰、驗證失敗、限流、逾時、服務錯誤與無效向量。生成整合層採嚴格門檻：分數不可用時不採用改寫，也不把結果寫入 `renditions`。此模組不回傳或記錄金鑰、原文、向量與原始錯誤訊息。

比較前統一 Unicode NFC 與換行，不刪除標點或否定詞。向量計算拒絕空向量、零向量、維度不符及非有限值，縮放後正規化以避免數值溢位。

## 驗證

使用 Node.js 22.18 以上或 24 執行：

```bash
node --test tests/semanticSimilarity.test.mjs tests/semanticSimilarityCalibration.test.mjs
```

測試使用人工向量與模擬 HTTP 回應，不發送真實貼文、不耗用模型額度。它驗證計算與錯誤處理；繁體中文校準樣本與真實金鑰的實測結果見 [SEMANTIC_SIMILARITY_CALIBRATION.md](SEMANTIC_SIMILARITY_CALIBRATION.md)。

目前已完成計算模組並接上寫入時預產流程。有效改寫會在輸出驗證通過後評估；只有 `score > 0.8` 且不等同 1 的改寫會被採用並寫入 `renditions`。評估失敗或 `score <= 0.8` 時不寫入該語氣改寫；`score` 等同 1 時視為沒有實質改寫，讀取時顯示原文且不標示為改寫。已建立本地繁體中文校準樣本與排序測試，真實 NIM embedding 金鑰實測仍需持續校準，不可把舊 `scale` 字串直接當成 embedding 分數。
