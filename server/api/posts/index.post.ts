import { z } from 'zod'
import { schema, useDb } from '../../db'
import { schedulePregeneration } from '../../utils/ai/render'
import { getPost } from '../../utils/posts'
import { requireUserId } from '../../utils/session'

const body = z.object({ text: z.string().trim().min(1).max(MAX_TEXT_LENGTH) })

/** 送出即發布：存的就是輸入框的字，沒有任何 AI 介入。 */
export default defineEventHandler(async (event): Promise<PostSummary> => {
  const authorId = requireUserId(event)
  const { text } = body.parse(await readBody(event))
  const [post] = await useDb()
    .insert(schema.posts)
    .values({ authorId, originalText: text })
    .returning({ id: schema.posts.id })
  // 預產所有預設語氣的改寫在背景跑，發文本身不等它
  schedulePregeneration(event, 'post', post!.id, authorId)
  setResponseStatus(event, 201)
  return (await getPost(post!.id, authorId))!
})
