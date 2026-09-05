/**
 * 預設語氣清單；讀者一定選其中一種，沒有「不改寫」這種選項，原文只透過顯示原文、
 * 自己的內容或改寫失敗出現。instruction 是交給模型的風格描述，清單內容改這裡即可。
 */
const TONE_DEFINITIONS = [
  {
    id: 'gentle_friendly',
    label: '溫和友善',
    description: '把尖銳處理成友善、好入口的說法，保留負面意見。',
    sample: '今天的會議沒有達到期待，之後也許可以更聚焦一點。',
    instruction: '用溫和、友善、尊重對方的語氣重述。把尖銳、命令式或容易引發防衛的措辭換成較好入口的說法，但不要把負面意見改成正面意見，也不要替原文加上道歉或安慰。'
  },
  {
    id: 'objective_neutral',
    label: '客觀中立',
    description: '去掉情緒和評價，只保留事實、立場和清楚的關係。',
    sample: '今天的會議效率不高，沒有達成預期結果。',
    instruction: '用客觀、中立、不帶情緒渲染的語氣重述。保留原文事實、數字、立場與結論，移除誇飾、嘲諷、攻擊與多餘情緒字眼；不要新增原文沒有的推論或評價。'
  },
  {
    id: 'clear_concise',
    label: '清楚簡潔',
    description: '縮短鋪陳，保留重點、事實與立場。',
    sample: '今天的會議效率不高。',
    instruction: '用清楚、簡潔、容易快速理解的語氣重述。刪去冗詞、重複與不必要的鋪陳，保留原文所有關鍵事實、數字、人物、立場與結論；不要摘要到失去重要資訊。'
  },
  {
    id: 'literary',
    label: '文青風',
    description: '用細膩、帶畫面感的句子重述，但不把內容寫成散文創作。',
    sample: '今天的會議像霧裡趕路，方向還在，焦點卻散了一些。',
    instruction: '用文青、細膩、帶一點畫面感的語氣重述。可以使用含蓄的節奏與輕微意象，但必須保留原文所有關鍵事實、數字、人物、立場與結論；不要新增原文沒有的情緒、比喻、故事或文學化解讀。'
  },
  {
    id: 'huangshanliao',
    label: '黃山料體',
    description: '用很短、像金句又像廢話的句子，搭配大量換行留白表達情緒。',
    sample: '如果會議沒有重點。\n\n那重點。\n\n就是會議沒有重點。',
    instruction: '用黃山料體重述：句子要短，每句盡量像看似深刻、細想又像廢話的金句，並用大量換行留白製造情緒停頓。可以使用「如果__就__」、「不是__而是__」、「你以為__其實__」這類句型；但必須保留原文所有關鍵事實、數字、人物、立場與結論。不要新增原文沒有的故事、承諾、攻擊或結論，也不要把語意改成雞湯或勵志文。'
  },
  {
    id: 'caige',
    label: '財哥體',
    description: '在文字間大量插入刪節號，讓連續文字每段不超過三個字。',
    sample: '今天…會議…效果…普通…重點…要…抓緊…一點。',
    instruction: '用財哥體重述：在一行文字間大量插入刪節號「…」，切分連續文字，讓每一段連續文字盡量不超過三個中文字，例如「這位…檳友…講話…太快…會…咬到…舌頭…」。語氣可以口語、直接、有停頓感，但必須保留原文所有關鍵事實、數字、人物、立場與結論；不要新增投資、金錢、成功學或原文沒有的建議。標點與數字可以保留原樣，不要為了切段破壞網址、標籤、帳號、金額或百分比。'
  },
  {
    id: 'linkedin_grateful',
    label: 'LinkedIn 感謝風',
    description: '用正向、感謝、強調價值與收穫的職場貼文語氣重述。',
    sample: '很開心這次討論帶來不少收穫，也謝謝大家的投入，讓我再次看見持續優化的價值。',
    instruction: '用 LinkedIn 上常見的正向感謝型貼文語氣重述。語氣要積極、心情好、真誠感謝，強調這次經驗帶來的價值、收穫、學習、連結或啟發；可以自然使用「很開心」、「很感謝」、「收穫很多」、「也推薦大家」這類職場分享語感。必須保留原文所有關鍵事實、數字、人物、立場與結論；不要捏造原文沒有的成果、指標、合作對象、得獎、職稱、致謝對象或行動呼籲，也不要把負面事件改寫成虛假的成功故事。'
  }
] as const

export type ToneId = typeof TONE_DEFINITIONS[number]['id']

export interface Tone {
  id: ToneId
  label: string
  description: string
  sample: string
  instruction: string
}

export const TONES: readonly Tone[] = TONE_DEFINITIONS

export const TONE_IDS = TONES.map(tone => tone.id) as [ToneId, ...ToneId[]]

/** 引導設定表單預選的語氣。 */
export const DEFAULT_TONE: Tone = TONES[0]!

/** 資料庫存的是字串，值域外的舊值回 undefined，呼叫端一律當「沒有語氣」處理。 */
export function findTone(id: string): Tone | undefined {
  return TONES.find(tone => tone.id === id)
}
