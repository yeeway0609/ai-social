import assert from 'node:assert/strict'
import test from 'node:test'
import {
  InvalidRenditionError,
  InvalidSemanticSimilarityError,
  MIN_SEMANTIC_SIMILARITY_SCORE,
  isSemanticallySameAsOriginal,
  validateRenditionText,
  validateSemanticSimilarityForRendition
} from '../server/utils/ai/outputValidation.ts'
import { buildSystemPrompt } from '../server/utils/ai/prompt.ts'
import { TONES } from '../shared/utils/tones.ts'

const expectCode = (action, code) => assert.throws(action, error => error instanceof InvalidRenditionError && error.code === code)
const expectSimilarityCode = (action, code) => assert.throws(action, error => error instanceof InvalidSemanticSimilarityError && error.code === code)

test('接受非空且未過度膨脹的改寫', () => {
  assert.doesNotThrow(() => validateRenditionText('今天 3 點開會。', '今天 3 點要開會，請大家留意。'))
})

test('拒絕空輸出與過長輸出', () => {
  expectCode(() => validateRenditionText('短文', ' \n'), 'invalid_model_output')
  expectCode(() => validateRenditionText('短文', '字'.repeat(501)), 'output_too_long')
})

test('網址、數字、金額、標籤與帳號必須原樣保留', () => {
  const original = '請看 https://example.com/a，預算 $1,200，完成 30%，標記 #Demo，找 @alice。'
  for (const rendition of [
    '請看 https://example.com/b，預算 $1,200，完成 30%，標記 #Demo，找 @alice。',
    '請看 https://example.com/a，預算 $1,300，完成 30%，標記 #Demo，找 @alice。',
    '請看 https://example.com/a，預算 $1,200，完成 31%，標記 #Demo，找 @alice。',
    '請看 https://example.com/a，預算 $1,200，完成 30%，標記 #Prod，找 @alice。',
    '請看 https://example.com/a，預算 $1,200，完成 30%，標記 #Demo，找 @bob。'
  ]) {
    expectCode(() => validateRenditionText(original, rendition), 'token_changed')
  }
})

test('語意相似度必須高於門檻且不可缺少分數', () => {
  assert.equal(MIN_SEMANTIC_SIMILARITY_SCORE, 0.8)
  assert.doesNotThrow(() => validateSemanticSimilarityForRendition({
    status: 'ok',
    score: 0.801,
    model: 'text-embedding-3-small',
    version: 'cosine-nfc-v1'
  }))
  expectSimilarityCode(() => validateSemanticSimilarityForRendition({
    status: 'ok',
    score: 0.8,
    model: 'text-embedding-3-small',
    version: 'cosine-nfc-v1'
  }), 'semantic_similarity_too_low')
  expectSimilarityCode(() => validateSemanticSimilarityForRendition({
    status: 'unavailable',
    score: null,
    error: 'no_embedding_credential'
  }), 'semantic_similarity_unavailable')
})

test('語意相似度等同一百趴時視為原文', () => {
  assert.equal(isSemanticallySameAsOriginal({
    status: 'ok',
    score: 1,
    model: 'text-embedding-3-small',
    version: 'cosine-nfc-v1'
  }), true)
  assert.equal(isSemanticallySameAsOriginal({
    status: 'ok',
    score: 0.9999999999,
    model: 'text-embedding-3-small',
    version: 'cosine-nfc-v1'
  }), true)
  assert.equal(isSemanticallySameAsOriginal({
    status: 'ok',
    score: 0.999,
    model: 'text-embedding-3-small',
    version: 'cosine-nfc-v1'
  }), false)
  assert.equal(isSemanticallySameAsOriginal(null), false)
})

test('所有語氣 prompt 都包含共通不變量與語意相似度要求', () => {
  const prompt = buildSystemPrompt(TONES)
  for (const tone of TONES) {
    assert.match(prompt, /不可曲解原文立場/)
    assert.match(prompt, /不可增加、刪除或改動任何客觀事實、數字、人物/)
    assert.match(prompt, /語意相似度都必須高於 80%/)
    assert.match(prompt, /採最小改寫原則/)
    assert.match(prompt, /優先保留原句資訊順序與句意結構/)
    assert.match(prompt, /必須保留否定、程度、副詞、條件、時間順序、因果關係與不確定語氣/)
    assert.match(prompt, /輸出前先在內部自檢/)
    assert.match(prompt, /自檢過程不要輸出/)
    assert.match(prompt, new RegExp(`"${tone.id}"（${tone.label}）`))
  }
})
