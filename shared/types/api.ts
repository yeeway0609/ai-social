import type { ContentKind, RewriteScale } from '../utils/content'
import type { ToneId } from '../utils/tones'
import type { SemanticSimilarityResult } from './semanticSimilarity'

export interface UserSummary {
  id: string
  username: string
  displayName: string
}

/** 登入者本人；tone 為 null 代表尚未完成引導設定。 */
export interface CurrentUser extends UserSummary {
  tone: ToneId | null
  onboardedAt: string | null
}

export interface SettingsUpdate {
  tone: ToneId
}

export interface LoginRequest {
  username: string
  password: string
}

/** 一則內容在讀者語氣下已存好的改寫；讀取時直接從資料庫撈，不再呼叫模型。 */
export interface Rendition {
  text: string
  scale: RewriteScale
  /** null 表示舊快取尚未評估。 */
  semanticSimilarity: SemanticSimilarityResult | null
}

/**
 * 他人的內容不帶原文，前端顯示 rendition，或透過「顯示原文」另外取得；
 * 自己的內容與尚未設定語氣的讀者 originalText 直接給。
 */
export interface ContentSummary {
  id: string
  author: UserSummary
  originalText: string | null
  isOwn: boolean
  createdAt: string
  /** 他人的內容才有；null 代表這個語氣還沒有改寫（尚在預產中，或預產失敗）。 */
  rendition: Rendition | null
  /** 剛寫入、背景預產可能還沒跑完；前端據此決定要等一下再撈還是直接顯示原文。 */
  isRenditionPending: boolean
}

export type CommentSummary = ContentSummary

export interface PostSummary extends ContentSummary {
  likeCount: number
  commentCount: number
  isLiked: boolean
  /** 列表上串在貼文底下的第一則留言預覽；沒有留言為 null。 */
  firstComment: CommentSummary | null
}

export interface MessageSummary extends ContentSummary {
  conversationId: string
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

export interface TextCreate {
  text: string
}

export interface LikeResult {
  isLiked: boolean
  likeCount: number
}

/** 聊天分頁的一列：每位其他使用者一列，沒聊過的 conversationId 為 null。 */
export interface ConversationSummary {
  conversationId: string | null
  other: UserSummary
  lastMessageAt: string | null
  /** 最後一則訊息，供列表預覽；和對話內一樣帶讀者語氣的改寫。沒聊過為 null。 */
  lastMessage: MessageSummary | null
}

/** 預產尚未完成時前端輪詢用；改寫仍缺且已不在等待期，就附上原文讓前端直接顯示。 */
export interface RenditionLookup {
  kind: ContentKind
  id: string
  rendition: Rendition | null
  isPending: boolean
  originalText: string | null
}

/** 預產單一語氣時的失敗分類；只在伺服器內部與 log 使用，讀者端看不到。 */
export type RenditionError
  = | 'ai_unavailable'
    | 'model_error'
    | 'timeout'
    | 'invalid_model_output'
    | 'token_changed'
    | 'output_too_long'
    | 'semantic_similarity_unavailable'
    | 'semantic_similarity_too_low'

export interface OriginalResult {
  kind: ContentKind
  id: string
  text: string
}
