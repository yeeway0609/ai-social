/**
 * 改寫幅度用字元 bigram 的 Dice 係數估相似度，不多花一次模型呼叫。
 * 中文沒有空白分詞，bigram 比整詞比對穩；閾值是拍腦袋定的，之後看實際分布再調。
 */
export function measureRewriteScale(original: string, rewritten: string): RewriteScale {
  const similarity = diceSimilarity(original, rewritten)
  if (similarity >= 0.75) return 'nearly_original'
  if (similarity >= 0.4) return 'light'
  return 'heavy'
}

function bigrams(text: string) {
  const chars = Array.from(text.replace(/\s+/g, ''))
  const counts = new Map<string, number>()
  for (let i = 0; i < chars.length - 1; i++) {
    const gram = chars[i]! + chars[i + 1]!
    counts.set(gram, (counts.get(gram) ?? 0) + 1)
  }
  return counts
}

function diceSimilarity(a: string, b: string) {
  const gramsA = bigrams(a)
  const gramsB = bigrams(b)
  let sizeA = 0
  let sizeB = 0
  let overlap = 0
  for (const count of gramsA.values()) sizeA += count
  for (const count of gramsB.values()) sizeB += count
  for (const [gram, count] of gramsA) overlap += Math.min(count, gramsB.get(gram) ?? 0)
  if (sizeA + sizeB === 0) return 1
  return (2 * overlap) / (sizeA + sizeB)
}
