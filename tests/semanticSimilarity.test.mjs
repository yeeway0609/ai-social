import assert from 'node:assert/strict'
import test from 'node:test'
import { cosineSimilarity, measureSemanticSimilarity } from '../server/utils/ai/semanticSimilarity.ts'

const input = { originalText: '這次會議沒有效率。', rewrittenText: '這次會議的效率還有改善空間。', apiKey: 'test-only', model: 'test-model', embeddingsUrl: 'https://embeddings.test/v1/embeddings' }
const payload = (data = [{ index: 1, embedding: [3, 4] }, { index: 0, embedding: [1, 0] }]) => ({ model: 'test-model', data })
const respond = value => async () => Response.json(value)

test('相同、正交與相反向量保留 cosine 的方向', () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1)
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0)
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1)
})

test('拒絕維度不符、空、零及非有限向量', () => {
  for (const [left, right] of [[[], []], [[1], [1, 2]], [[0, 0], [1, 2]], [[NaN], [1]], [[1], [Infinity]]]) {
    assert.equal(cosineSimilarity(left, right), null)
  }
})

test('極大與極小向量不溢位，交換輸入不改變分數', () => {
  for (const value of [1e308, 1e-308]) assert.ok(Math.abs(cosineSimilarity([value, value], [1, 1]) - 1) < 1e-12)
  assert.equal(cosineSimilarity([1, 2], [3, 4]), cosineSimilarity([3, 4], [1, 2]))
})

test('同一請求送出兩段文字，依 index 讀取向量並回傳模型版本', async () => {
  let calls = 0
  const result = await measureSemanticSimilarity({ ...input, originalText: 'e\u0301\r\n文字' }, async (url, options) => {
    calls++
    assert.equal(url, input.embeddingsUrl)
    assert.equal(options.redirect, 'error')
    const body = JSON.parse(options.body)
    assert.deepEqual(body.input, ['é\n文字', input.rewrittenText])
    assert.equal(body.encoding_format, 'float')
    return Response.json(payload())
  })
  assert.equal(calls, 1)
  assert.deepEqual(result, { status: 'ok', score: 0.6, model: 'test-model', version: 'cosine-nfc-v1' })
})

test('空文字、無金鑰與無效逾時設定不發送請求', async () => {
  const never = async () => {
    assert.fail('不應呼叫 API')
  }
  for (const patch of [{ originalText: ' ' }, { rewrittenText: '' }, { timeoutMs: 0 }, { timeoutMs: 30001 }, { model: '' }]) {
    assert.equal((await measureSemanticSimilarity({ ...input, ...patch }, never)).error, 'invalid_input')
  }
  assert.equal((await measureSemanticSimilarity({ ...input, apiKey: null }, never)).error, 'no_embedding_credential')
})

test('拒絕重複、遺失、額外索引及無效向量', async () => {
  for (const data of [[], [{ index: 0, embedding: [1] }], [{ index: 0, embedding: [1] }, { index: 0, embedding: [1] }], [{ index: 0, embedding: [1] }, { index: 2, embedding: [1] }], [{ index: 0, embedding: [0] }, { index: 1, embedding: [1] }], [{ index: 0, embedding: [1, 2] }, { index: 1, embedding: [1] }], [{ index: 0, embedding: ['1'] }, { index: 1, embedding: [1] }]]) {
    assert.equal((await measureSemanticSimilarity(input, respond(payload(data)))).error, 'invalid_embedding_output')
  }
  assert.equal((await measureSemanticSimilarity(input, respond({ data: payload().data }))).error, 'invalid_embedding_output')
})

test('驗證失敗、限流與服務錯誤分流且不重試', async () => {
  for (const [status, expected] of [[401, 'embedding_authentication_failed'], [403, 'embedding_authentication_failed'], [429, 'embedding_rate_limited'], [500, 'embedding_service_error']]) {
    let calls = 0
    const result = await measureSemanticSimilarity(input, async () => {
      calls++
      return new Response('sensitive-service-response', { status })
    })
    assert.deepEqual(result, { status: 'unavailable', score: null, error: expected })
    assert.equal(calls, 1)
  }
})

test('無效 JSON 與網路錯誤不洩漏內容', async () => {
  assert.equal((await measureSemanticSimilarity(input, async () => new Response('not-json'))).error, 'invalid_embedding_output')
  const result = await measureSemanticSimilarity(input, async () => {
    throw new Error('sensitive-request')
  })
  assert.deepEqual(result, { status: 'unavailable', score: null, error: 'embedding_service_error' })
})

test('逾時中止請求且回傳無分數', async () => {
  const result = await measureSemanticSimilarity({ ...input, timeoutMs: 5 }, async (_url, options) => {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 1000)
      options.signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(options.signal.reason)
      }, { once: true })
    })
    return Response.json(payload())
  })
  assert.deepEqual(result, { status: 'unavailable', score: null, error: 'embedding_timeout' })
})
