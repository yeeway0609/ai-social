import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

/**
 * 每家供應商收斂成同一個呼叫形狀：吃系統指示與原文、回改寫後的純文字。
 * 之所以不共用一套 SDK 抽象，是因為只需要「一次無狀態的文字轉文字」，
 * 各自五行就寫完，包一層通用 client 只會多一層要維護的對映。
 */
export type RewriteFn = (args: {
  apiKey: string
  model: string
  system: string
  original: string
}) => Promise<string>

const anthropic: RewriteFn = async ({ apiKey, model, system, original }) => {
  const response = await new Anthropic({ apiKey }).messages.create({
    model,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: original }]
  })
  return response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim()
}

const openai: RewriteFn = async ({ apiKey, model, system, original }) => {
  const response = await new OpenAI({ apiKey }).responses.create({
    model,
    instructions: system,
    input: original
  })
  return response.output_text.trim()
}

export const REWRITE_FNS: Record<AiProvider, RewriteFn> = { anthropic, openai }

export function modelFor(provider: AiProvider) {
  const { ai } = useRuntimeConfig()
  return provider === 'anthropic' ? ai.modelAnthropic : ai.modelOpenai
}
