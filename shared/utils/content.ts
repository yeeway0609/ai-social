/** 改寫服務用來區分要改寫哪種內容。 */
export const CONTENT_KINDS = ['post', 'comment', 'message'] as const
export type ContentKind = typeof CONTENT_KINDS[number]

/** 貼文、留言、訊息共用的純文字上限（同 Threads）。 */
export const MAX_TEXT_LENGTH = 500

/** 改寫幅度三檔：讓讀者知道自己看到的離原話有多遠。 */
export const REWRITE_SCALES = ['nearly_original', 'light', 'heavy'] as const
export type RewriteScale = typeof REWRITE_SCALES[number]

export const REWRITE_SCALE_LABELS: Record<RewriteScale, string> = {
  nearly_original: '幾乎原話',
  light: '微調',
  heavy: '大幅改寫'
}

/** 聊天對話頁輪詢新訊息的間隔。 */
export const CHAT_POLL_INTERVAL_MS = 3000

/** 讀者端同時進行中的改寫請求上限；快速捲動時其餘排隊。 */
export const MAX_CONCURRENT_RENDERS = 3
