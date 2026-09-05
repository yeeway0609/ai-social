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
export const CHAT_POLL_INTERVAL_MS = 1000

/** 內容寫入後多久內視為「預產可能還沒跑完」，前端在這段時間先等改寫、之後才退回原文。 */
export const RENDITION_PENDING_WINDOW_MS = 60_000

/** 預產未完成時前端輪詢改寫的間隔與最多次數。 */
export const RENDITION_POLL_INTERVAL_MS = 2000
export const RENDITION_POLL_MAX_COUNT = 10
