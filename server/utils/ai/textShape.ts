/**
 * 提示詞與輸出驗證共用的文字量測。中文沒有空白分詞，所以「句」以句末標點與換行切、
 * 「字」只算字母與數字：這樣財哥體塞滿的刪節號、黃山料體加的空行都不會灌水。
 */

const SENTENCE_BOUNDARY = /[。！？!?；;\n…]+|\.{3,}/u
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u

/** 純語氣詞與句尾助詞：拿掉之後剩不到幾個字的內容，沒有可以改寫的命題。 */
const INTERJECTIONS = /[欸哈嗯喔哦啊呀哇呃嘿唉呵嘻齁蛤嗚噢喂吧呢啦囉嘛耶]/gu

/** 判斷短內容能否改寫的最少字數；再少就只剩感嘆，模型只能無中生有。 */
const MIN_REWRITABLE_LETTER_COUNT = 4

export function countSentences(text: string): number {
  return text.split(SENTENCE_BOUNDARY).filter(part => LETTER_OR_DIGIT.test(part)).length
}

export function countParagraphs(text: string): number {
  return text.split(/\n+/).filter(part => LETTER_OR_DIGIT.test(part)).length
}

/** 去掉標點、空白與表情符號後只剩字母與數字，方便做比例與片段比對。 */
export function lettersOnly(text: string): string {
  return Array.from(text.normalize('NFC')).filter(char => LETTER_OR_DIGIT.test(char)).join('')
}

/**
 * 「欸欸欸欸」「???」「傻眼」這類內容沒有命題可改，硬改只會變成描述原文或捏造情節。
 * 連續重複字只算一個，所以「哈哈哈哈哈」與「好好好」都不算有內容。
 */
export function hasRewritableContent(text: string): boolean {
  const letters = lettersOnly(text).replace(INTERJECTIONS, '')
  let distinct = ''
  for (const char of letters) {
    if (!distinct.endsWith(char)) distinct += char
  }
  return Array.from(distinct).length >= MIN_REWRITABLE_LETTER_COUNT
}
