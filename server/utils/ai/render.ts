import { schema, useDb } from '../../db'
import { eq } from 'drizzle-orm'
import { loadContent } from '../content'
import { resolveCredential } from './credentials'
import { buildSystemPrompt, wrapOriginal } from './prompt'
import { classifyProviderError, modelFor, REWRITE_FNS } from './providers'
import { measureRewriteScale } from './scale'

const RENDER_TIMEOUT_MS = 10_000

export class ContentNotFoundError extends Error {
  readonly code = 'content_not_found'
}

/**
 * 改寫服務的唯一入口：給一則內容與一位讀者，回那位讀者該看到的樣子。
 * 失敗一律退回原文並帶錯誤碼，不丟例外——feed 上任何一則都不能因為模型出問題而變空白。
 */
export async function renderContent(kind: ContentKind, id: string, viewerId: string): Promise<RenditionResult> {
  const content = await loadContent(kind, id)
  if (!content) throw new ContentNotFoundError()

  const original = (text: string, error: RenditionResult['error'] = null, source: CredentialSource | null = null): RenditionResult =>
    ({ kind, id, text, isOriginal: true, scale: null, source, error })

  if (content.authorId === viewerId) return original(content.originalText)

  const [viewer] = await useDb()
    .select({ tone: schema.users.tone, customInstruction: schema.users.customInstruction })
    .from(schema.users)
    .where(eq(schema.users.id, viewerId))
    .limit(1)
  const tone = findTone(viewer?.tone ?? ORIGINAL_TONE)
  if (!tone || tone.id === ORIGINAL_TONE) return original(content.originalText)

  const { ai } = useRuntimeConfig()
  const system = buildSystemPrompt(tone, viewer?.customInstruction ?? null)

  if (ai.mock) {
    return {
      kind, id, isOriginal: false, source: 'pool', error: null,
      text: mockRewrite(tone.label, content.originalText),
      scale: 'light'
    }
  }

  const provider = isAiProvider(ai.defaultProvider) ? ai.defaultProvider : 'anthropic'
  const credential = await resolveCredential(viewerId, provider)
  if (!credential) return original(content.originalText, 'no_ai_credential')

  try {
    const text = await REWRITE_FNS[provider]({
      apiKey: credential.apiKey,
      model: modelFor(provider),
      system,
      original: wrapOriginal(content.originalText),
      timeoutMs: RENDER_TIMEOUT_MS
    })
    if (!text) return original(content.originalText, 'provider_error', credential.source)
    return {
      kind, id, text, isOriginal: false,
      scale: measureRewriteScale(content.originalText, text),
      source: credential.source,
      error: null
    }
  } catch (err) {
    return original(content.originalText, classifyProviderError(err), credential.source)
  }
}

/** 沒有金鑰時的本機開發替身：看得出「有被改寫」就好，不追求像真的。 */
function mockRewrite(toneLabel: string, text: string) {
  return `（${toneLabel}）${text}`
}
