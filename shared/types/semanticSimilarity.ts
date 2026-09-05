export const SEMANTIC_SIMILARITY_VERSION = 'cosine-nfc-v1'

export type SemanticSimilarityError
  = | 'invalid_input'
  | 'no_embedding_credential'
  | 'embedding_authentication_failed'
  | 'embedding_rate_limited'
  | 'embedding_timeout'
  | 'embedding_provider_error'
  | 'invalid_embedding_output'

export type SemanticSimilarityResult = {
  status: 'ok'
  score: number
  model: string
  version: typeof SEMANTIC_SIMILARITY_VERSION
} | {
  status: 'unavailable'
  score: null
  error: SemanticSimilarityError
}
