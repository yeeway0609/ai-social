import assert from 'node:assert/strict'
import test from 'node:test'

test('逾時、金鑰問題與其他供應商錯誤各自分類', async (t) => {
  let modules
  try {
    modules = await Promise.all([import('openai'), import('../server/utils/ai/nvidia.ts')])
  } catch {
    t.skip('本機尚未安裝 openai SDK，跳過分類測試')
    return
  }
  const [{ default: OpenAI }, { AiNotConfiguredError, classifyProviderError }] = modules
  assert.equal(classifyProviderError(new AiNotConfiguredError()), 'ai_unavailable')
  assert.equal(classifyProviderError(new OpenAI.AuthenticationError(401, undefined, 'x', undefined)), 'ai_unavailable')
  assert.equal(classifyProviderError(new OpenAI.RateLimitError(429, undefined, 'x', undefined)), 'ai_unavailable')
  assert.equal(classifyProviderError(new OpenAI.APIConnectionTimeoutError()), 'timeout')
  assert.equal(classifyProviderError(new Error('unknown')), 'provider_error')
})
