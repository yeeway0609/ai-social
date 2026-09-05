import assert from 'node:assert/strict'
import test from 'node:test'

test('供應商驗證失敗、限流與逾時各自分類', async (t) => {
  let modules
  try {
    modules = await Promise.all([
      import('@anthropic-ai/sdk'),
      import('openai'),
      import('../server/utils/ai/providers.ts')
    ])
  } catch {
    t.skip('本機尚未安裝供應商 SDK，跳過分類測試')
    return
  }
  const [{ default: Anthropic }, { default: OpenAI }, { classifyProviderError }] = modules
  assert.equal(classifyProviderError(new Anthropic.AuthenticationError(401, undefined, 'x', undefined)), 'provider_authentication_failed')
  assert.equal(classifyProviderError(new Anthropic.RateLimitError(429, undefined, 'x', undefined)), 'provider_rate_limited')
  assert.equal(classifyProviderError(new OpenAI.APIConnectionTimeoutError()), 'timeout')
  assert.equal(classifyProviderError(new Error('unknown')), 'provider_error')
})
