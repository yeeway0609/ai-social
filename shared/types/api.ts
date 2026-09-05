import type { CredentialSource } from '../utils/ai'
import type { ContentKind, RewriteScale } from '../utils/content'
import type { SemanticSimilarityResult } from './semanticSimilarity'

export interface UserSummary {
  id: string
  username: string
  displayName: string
}

/** 登入者本人；tone 為 null 代表尚未完成引導設定。 */
export interface CurrentUser extends UserSummary {
  tone: string | null
  customInstruction: string | null
  onboardedAt: string | null
}

export interface SettingsUpdate {
  tone: string
  customInstruction: string | null
}

export interface LoginRequest {
  username: string
  password: string
}

/**
 * 他人的內容不帶原文，前端要透過改寫服務或「顯示原文」另外取得；
 * 自己的內容 originalText 直接給，因為作者永遠看原文。
 */
export interface ContentSummary {
  id: string
  author: UserSummary
  originalText: string | null
  isOwn: boolean
  createdAt: string
}

export interface PostSummary extends ContentSummary {
  likeCount: number
  commentCount: number
  isLiked: boolean
}

export type CommentSummary = ContentSummary

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
}

export interface RenderRequest {
  kind: ContentKind
  id: string
}

export interface RenditionResult {
  kind: ContentKind
  id: string
  text: string
  /** true 代表這就是原文（作者本人、讀者尚未設定語氣、或改寫失敗）。 */
  isOriginal: boolean
  scale: RewriteScale | null
  /** null 表示尚未評估、舊快取或顯示原文。 */
  semanticSimilarity: SemanticSimilarityResult | null
  source: CredentialSource | null
  error: RenditionError | null
}

export type RenditionError =
  | 'no_ai_credential'
  | 'provider_authentication_failed'
  | 'provider_rate_limited'
  | 'provider_error'
  | 'timeout'
  | 'invalid_model_output'
  | 'token_changed'
  | 'output_too_long'

export interface OriginalResult {
  kind: ContentKind
  id: string
  text: string
}

/** 批次端點的整合契約；目前單筆端點與前端佇列尚未切換。 */
export interface RenderBatchRequest {
  items: RenderRequest[]
}

export type RenderBatchItem = Omit<RenditionResult, 'error'> & {
  error: RenditionResult['error']
}

export interface RenderBatchResult {
  version: 'rendition-batch-v1'
  items: RenderBatchItem[]
}
