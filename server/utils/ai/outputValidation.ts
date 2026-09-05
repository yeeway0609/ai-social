import { MAX_TEXT_LENGTH } from '../../../shared/utils/content.ts'
import type { RenditionError } from '../../../shared/types/api.ts'
import type { SemanticSimilarityResult } from '../../../shared/types/semanticSimilarity.ts'
import type { Tone } from '../../../shared/utils/tones.ts'
import { countSentences, lettersOnly } from './textShape.ts'

const MAX_RENDITION_LENGTH_MULTIPLIER = 2
/**
 * 只擋明顯離題，不當忠實度的主防線：embedding 對人稱反轉、否定翻轉幾乎無感（校準樣本 0.95），
 * 忠實度靠下面的確定性守門。實測錯誤輸出落在 0.52 到 0.87，0.5 什麼都擋不住。
 */
export const MIN_SEMANTIC_SIMILARITY_SCORE = 0.7
const SEMANTIC_SIMILARITY_EXACT_MATCH_EPSILON = 1e-9

const EXACT_TOKEN_PATTERNS = [
  /https?:\/\/[^\s<>"'，。！？、）)]+/giu,
  /[$€¥£]?\d[\d,]*(?:\.\d+)?(?:%|％|元|塊|美元|台幣|人|個|次|天|年|月|日|點|分|秒|歲|kg|g|km|m|cm)?/giu,
  /[#＃][\p{L}\p{N}_-]+/gu,
  /@[A-Za-z0-9_][A-Za-z0-9_.-]*/gu
] as const

const FIRST_PERSON = /我/u
const SECOND_PERSON = /[你妳]/u
const FORMAL_SECOND_PERSON = /您/u
/** 模型把作者改成旁白時會用的稱呼；原文有「我」而改寫只剩這些，就是轉述而不是改寫。 */
const THIRD_PARTY_LABELS = /他|她|作者|提問者|發文者|用戶|使用者|對方|當事人/u

/** 描述原文而非改寫原文時會出現的字眼；原文自己就有的不算。 */
const META_DESCRIPTION_TERMS = ['原文', '這段文字', '這句話', '這段話', '這則訊息', '這則貼文', '符號', '感嘆詞', '語助詞', '用戶', '使用者', '提問者', '發文者', '用戶表示', '對方情緒', '聲音'] as const

/** 黃山料體舊提示用字母當變數示範句型，模型曾原字輸出「如果 A，那 B 就是 C」。 */
const TEMPLATE_PLACEHOLDER = /(?:如果|那麼|那|就是|不是|而是|其實是|以為是)\s?[A-Z](?![A-Za-z0-9])/u
const SAMPLE_LEAK_FRAGMENT_LENGTH = 5

/** 覆蓋下限：句數與字數同時看，清楚簡潔本來就該短，字數放寬。 */
const MIN_SENTENCE_RATIO = 0.7
const MIN_LETTER_RATIO = 0.4
const MIN_LETTER_RATIO_CONCISE = 0.3

type RenditionTextError = Extract<RenditionError, 'invalid_model_output' | 'token_changed' | 'output_too_long' | 'perspective_changed' | 'content_dropped' | 'sample_leaked' | 'meta_description'>

export class InvalidRenditionError extends Error {
  readonly code: RenditionTextError

  constructor(code: RenditionTextError) {
    super(code)
    this.code = code
  }
}

export class InvalidSemanticSimilarityError extends Error {
  readonly code: Extract<RenditionError, 'semantic_similarity_unavailable' | 'semantic_similarity_too_low'>

  constructor(code: Extract<RenditionError, 'semantic_similarity_unavailable' | 'semantic_similarity_too_low'>) {
    super(code)
    this.code = code
  }
}

function uniqueExactTokens(text: string): string[] {
  const tokens = new Set<string>()
  for (const pattern of EXACT_TOKEN_PATTERNS) {
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) tokens.add(match[0])
  }
  return [...tokens]
}

function assertPerspectiveKept(original: string, rendition: string) {
  if (FIRST_PERSON.test(original) && !FIRST_PERSON.test(rendition) && THIRD_PARTY_LABELS.test(rendition)) {
    throw new InvalidRenditionError('perspective_changed')
  }
  if (SECOND_PERSON.test(original) && !SECOND_PERSON.test(rendition)) {
    throw new InvalidRenditionError('perspective_changed')
  }
  if (!FORMAL_SECOND_PERSON.test(original) && FORMAL_SECOND_PERSON.test(rendition)) {
    throw new InvalidRenditionError('perspective_changed')
  }
}

function assertNotDescribingOriginal(original: string, rendition: string) {
  for (const term of META_DESCRIPTION_TERMS) {
    if (rendition.includes(term) && !original.includes(term)) throw new InvalidRenditionError('meta_description')
  }
}

/** 範例句與改寫共用五個字以上的連續片段（原文本來就有的不算），或出現佔位字母的句型。 */
function assertNoSampleLeak(original: string, rendition: string, tone: Tone) {
  if (TEMPLATE_PLACEHOLDER.test(rendition) && !TEMPLATE_PLACEHOLDER.test(original)) {
    throw new InvalidRenditionError('sample_leaked')
  }
  const sample = Array.from(lettersOnly(tone.sample))
  const renditionLetters = lettersOnly(rendition)
  const originalLetters = lettersOnly(original)
  for (let i = 0; i + SAMPLE_LEAK_FRAGMENT_LENGTH <= sample.length; i++) {
    const fragment = sample.slice(i, i + SAMPLE_LEAK_FRAGMENT_LENGTH).join('')
    if (renditionLetters.includes(fragment) && !originalLetters.includes(fragment)) {
      throw new InvalidRenditionError('sample_leaked')
    }
  }
}

function assertContentCovered(original: string, rendition: string, tone: Tone) {
  const requiredSentences = Math.max(1, Math.floor(countSentences(original) * MIN_SENTENCE_RATIO))
  if (countSentences(rendition) < requiredSentences) throw new InvalidRenditionError('content_dropped')

  const originalLetterCount = Array.from(lettersOnly(original)).length
  if (originalLetterCount === 0) return
  const ratio = tone.id === 'clear_concise' ? MIN_LETTER_RATIO_CONCISE : MIN_LETTER_RATIO
  if (Array.from(lettersOnly(rendition)).length < originalLetterCount * ratio) {
    throw new InvalidRenditionError('content_dropped')
  }
}

/**
 * 模型輸出即使來自結構化 API 仍不可信。這裡全是不用呼叫模型的確定性檢查：先守精確資料，
 * 再擋「轉述而非改寫」的幾種固定長相——人稱跑掉、描述原文、抄範例、砍掉半篇。
 * 檢查的是字面特徵，會有漏網，但每一條都對應實際出過的錯。
 */
export function validateRenditionText(originalText: string, renditionText: string, tone: Tone): asserts renditionText is string {
  const original = originalText.normalize('NFC')
  const normalized = renditionText.normalize('NFC').trim()
  if (!normalized) throw new InvalidRenditionError('invalid_model_output')
  if (normalized.length > Math.max(original.length * MAX_RENDITION_LENGTH_MULTIPLIER, MAX_TEXT_LENGTH)) {
    throw new InvalidRenditionError('output_too_long')
  }

  for (const token of uniqueExactTokens(original)) {
    if (!normalized.includes(token)) throw new InvalidRenditionError('token_changed')
  }

  assertNotDescribingOriginal(original, normalized)
  assertNoSampleLeak(original, normalized, tone)
  assertPerspectiveKept(original, normalized)
  assertContentCovered(original, normalized, tone)
}

export function validateSemanticSimilarityForRendition(semanticSimilarity: SemanticSimilarityResult): void {
  if (semanticSimilarity.status !== 'ok') {
    throw new InvalidSemanticSimilarityError('semantic_similarity_unavailable')
  }
  if (semanticSimilarity.score <= MIN_SEMANTIC_SIMILARITY_SCORE) {
    throw new InvalidSemanticSimilarityError('semantic_similarity_too_low')
  }
}

export function isSemanticallySameAsOriginal(semanticSimilarity: SemanticSimilarityResult | null): boolean {
  return semanticSimilarity?.status === 'ok'
    && semanticSimilarity.score >= 1 - SEMANTIC_SIMILARITY_EXACT_MATCH_EPSILON
}
