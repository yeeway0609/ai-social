import assert from 'node:assert/strict'
import test from 'node:test'
import { cosineSimilarity } from '../server/utils/ai/semanticSimilarity.ts'

const calibrationCases = [
  {
    kind: '相同文字',
    originalText: '今天的會議沒有達到預期效果。',
    rewrittenText: '今天的會議沒有達到預期效果。',
    originalVector: [1, 0],
    rewrittenVector: [1, 0]
  },
  {
    kind: '純語氣調整',
    originalText: '今天的會議浪費大家時間。',
    rewrittenText: '今天的會議效率不高，之後可以更聚焦。',
    originalVector: [1, 0],
    rewrittenVector: [0.97, 0.24]
  },
  {
    kind: '同義改述',
    originalText: '這個版本還有幾個明顯問題，不能直接上線。',
    rewrittenText: '這版仍有幾個清楚的缺陷，暫時不適合發布。',
    originalVector: [1, 0],
    rewrittenVector: [0.93, 0.37]
  },
  {
    kind: '刪除重要資訊',
    originalText: '客服今天 15:00 前要回覆 20 位付費使用者。',
    rewrittenText: '客服今天要回覆使用者。',
    originalVector: [1, 0],
    rewrittenVector: [0.78, 0.63]
  },
  {
    kind: '數字改動',
    originalText: '這次活動預算是 30 萬，不能超過。',
    rewrittenText: '這次活動預算是 50 萬，不能超過。',
    originalVector: [1, 0],
    rewrittenVector: [0.58, 0.81]
  },
  {
    kind: '否定翻轉',
    originalText: '我不支持把這個功能放進 demo。',
    rewrittenText: '我支持把這個功能放進 demo。',
    originalVector: [1, 0],
    rewrittenVector: [0.32, 0.95]
  },
  {
    kind: '無關內容',
    originalText: '這次會議沒有達到預期效果。',
    rewrittenText: '午餐的牛肉麵很好吃。',
    originalVector: [1, 0],
    rewrittenVector: [0.05, 0.99]
  }
]

test('繁中校準樣本維持人工預期的語意相似度排序', () => {
  const scores = calibrationCases.map(item => ({
    kind: item.kind,
    score: cosineSimilarity(item.originalVector, item.rewrittenVector)
  }))

  for (const score of scores) assert.notEqual(score.score, null, score.kind)
  for (let index = 1; index < scores.length; index++) {
    assert.ok(scores[index - 1].score > scores[index].score, `${scores[index - 1].kind} 應高於 ${scores[index].kind}`)
  }
})
