/**
 * 預設語氣清單；讀者一定選其中一種，沒有「不改寫」這種選項，原文只透過顯示原文、
 * 自己的內容或改寫失敗出現。instruction 是交給模型的風格描述，清單內容改這裡即可。
 */
export interface Tone {
  id: string
  label: string
  description: string
  sample: string
  instruction: string
}

export const TONES: readonly Tone[] = [
  {
    id: 'gentle',
    label: '溫和體貼',
    description: '把尖銳的話說得柔軟，保留意思但去掉刺。',
    sample: '今天的會議好像沒有達到預期的效果，有點可惜。',
    instruction: '用溫和、體貼、不帶攻擊性的語氣重述。把尖銳、諷刺、命令式的措辭換成柔和的說法，攻擊性字眼改為中性描述，但不要把負面意見改成正面意見。'
  },
  {
    id: 'blunt',
    label: '直白犀利',
    description: '去掉客套與鋪陳，一刀切到重點。',
    sample: '會議浪費時間。',
    instruction: '用直白、犀利、不客套的語氣重述。刪掉鋪陳、敬語與含糊修飾，直接說重點，句子短而有力，但不新增原文沒有的批評。'
  },
  {
    id: 'sarcastic',
    label: '幽默嘲諷',
    description: '帶點自嘲與吐槽，嚴肅的事說得輕鬆。',
    sample: '今天的會議成功證明了時間是可以憑空消失的。',
    instruction: '用幽默、帶吐槽感的語氣重述，可以誇飾與反諷，但嘲諷對象只能是原文本來就在說的事，不可以嘲諷原文作者或新增被嘲諷的對象。'
  },
  {
    id: 'poetic',
    label: '文青詩意',
    description: '意象與留白，把日常說成散文。',
    sample: '會議室的鐘走了兩圈，我們什麼也沒帶走。',
    instruction: '用文青、詩意、多用意象與留白的散文語氣重述。可以用比喻，但每個比喻都要對應原文明確提到的事，不可以憑空添加情節。'
  },
  {
    id: 'elder',
    label: '長輩 LINE 風',
    description: '早安圖式的熱情與關心，句尾感嘆號。',
    sample: '今天的會議真的很浪費時間！！大家要記得多喝水～ 保重身體！！',
    instruction: '用台灣長輩在 LINE 上的語氣重述：熱情、關心、多用驚嘆號與波浪號、常穿插「保重」「多喝水」之類的問候，但原文的事實與立場一個字都不能變。'
  }
]

export const TONE_IDS = TONES.map(tone => tone.id) as [string, ...string[]]

export function findTone(id: string): Tone | undefined {
  return TONES.find(tone => tone.id === id)
}

/** 自訂語氣指示的長度上限；它會整段進 prompt，太長既貴又容易蓋過不變量。 */
export const MAX_CUSTOM_INSTRUCTION_LENGTH = 300
