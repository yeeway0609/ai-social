import assert from 'node:assert/strict'
import test from 'node:test'
import { InvalidRenditionError, validateRenditionText } from '../server/utils/ai/outputValidation.ts'

const expectCode = (action, code) => assert.throws(action, error => error instanceof InvalidRenditionError && error.code === code)

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
