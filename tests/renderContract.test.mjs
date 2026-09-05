import assert from 'node:assert/strict'
import test from 'node:test'
import { parseRenderBatchRequest, validateOriginalText, validateRenderResultIdentities } from '../shared/utils/renderContract.ts'

const item = index => ({ kind: 'post', id: `12345678-1234-4123-8123-${String(index).padStart(12, '0')}` })
const expectCode = (action, code) => assert.throws(action, error => error.code === code)

test('接受 1 至 6 筆，拒絕空批次與超過上限', () => {
  assert.equal(parseRenderBatchRequest({ items: [item(1)] }).items.length, 1)
  assert.equal(parseRenderBatchRequest({ items: Array.from({ length: 6 }, (_, index) => item(index)) }).items.length, 6)
  for (const items of [[], Array.from({ length: 7 }, (_, index) => item(index))]) {
    expectCode(() => parseRenderBatchRequest({ items }), 'invalid_render_request')
  }
})

test('不接受瀏覽器指定原文、讀者、語氣或自訂指示', () => {
  for (const key of ['originalText', 'text', 'viewerId', 'tone', 'customInstruction', 'provider']) {
    expectCode(() => parseRenderBatchRequest({ items: [item(1)], [key]: 'injected' }), 'invalid_render_request')
    expectCode(() => parseRenderBatchRequest({ items: [{ ...item(1), [key]: 'injected' }] }), 'invalid_render_request')
  }
})

test('拒絕無效 kind、UUID 與非物件輸入', () => {
  for (const value of [null, [], {}, { items: [null] }, { items: [{ ...item(1), kind: 'unknown' }] }, { items: [{ ...item(1), id: 'post-001' }] }]) {
    expectCode(() => parseRenderBatchRequest(value), 'invalid_render_request')
  }
})

test('相同 kind 與 UUID 不分大小寫去重，不同內容表可用相同 UUID', () => {
  const request = { kind: 'post', id: 'abcdefab-1234-4123-8123-123456789abc' }
  expectCode(() => parseRenderBatchRequest({ items: [request, { ...request, id: request.id.toUpperCase() }] }), 'duplicate_content')
  assert.equal(parseRenderBatchRequest({ items: [request, { ...request, kind: 'comment' }] }).items.length, 2)
})

test('原文採現有 UTF-16 上限，空白與超長均拒絕', () => {
  validateOriginalText('字'.repeat(500))
  validateOriginalText('😀'.repeat(250))
  for (const text of ['', ' \n', null, '字'.repeat(501), '😀'.repeat(251)]) {
    expectCode(() => validateOriginalText(text), 'invalid_original_text')
  }
})

test('結果不可遺失、新增、交換或重複貼文', () => {
  const request = { items: [item(1), item(2)] }
  validateRenderResultIdentities(request, request.items)
  for (const results of [[item(1)], [item(1), item(2), item(3)], [item(2), item(1)], [item(1), item(1)]]) {
    expectCode(() => validateRenderResultIdentities(request, results), 'result_identity_mismatch')
  }
})
