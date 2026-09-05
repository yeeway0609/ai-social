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
  }
]

export const TONE_IDS = TONES.map(tone => tone.id) as [string, ...string[]]

export function findTone(id: string): Tone | undefined {
  return TONES.find(tone => tone.id === id)
}

/** 自訂語氣指示的長度上限；它會整段進 prompt，太長既貴又容易蓋過不變量。 */
export const MAX_CUSTOM_INSTRUCTION_LENGTH = 300
