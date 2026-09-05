import { and, desc, eq, sql, type SQL } from 'drizzle-orm'
import { schema, useDb } from '../db'
import { getViewerTone, isRenditionPending, renditionColumns, renditionJoin, toRendition } from './ai/render'
import { beforeCursor, encodeCursor, PAGE_SIZE } from './pagination'
import { userSummaryColumns } from './users'

function postColumns(viewerId: string) {
  const db = useDb()
  return {
    id: schema.posts.id,
    authorId: schema.posts.authorId,
    originalText: schema.posts.originalText,
    createdAt: schema.posts.createdAt,
    author: userSummaryColumns,
    ...renditionColumns,
    likeCount: db.$count(schema.likes, eq(schema.likes.postId, schema.posts.id)),
    commentCount: db.$count(schema.comments, eq(schema.comments.postId, schema.posts.id)),
    isLiked: sql<boolean>`exists (select 1 from ${schema.likes} where ${schema.likes.postId} = ${schema.posts.id} and ${schema.likes.userId} = ${viewerId})`
  }
}

type PostRow = Awaited<ReturnType<typeof fetchPosts>>[number]

/** 讀者語氣下的改寫一起 join 出來，讀取端不再另外打改寫服務。 */
async function fetchPosts(viewerId: string, where: SQL | undefined, limit: number) {
  const viewerTone = await getViewerTone(viewerId)
  return useDb()
    .select(postColumns(viewerId))
    .from(schema.posts)
    .innerJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
    .leftJoin(schema.renditions, renditionJoin('post', schema.posts.id, viewerTone))
    .where(where)
    .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
    .limit(limit)
}

/** 他人的貼文不帶原文——前端只能拿到改寫版，或明確要求「顯示原文」。 */
function toSummary(row: PostRow, viewerId: string): PostSummary {
  const isOwn = row.authorId === viewerId
  const rendition = isOwn ? null : toRendition(row)
  return {
    id: row.id,
    author: row.author,
    originalText: isOwn ? row.originalText : null,
    isOwn,
    createdAt: row.createdAt.toISOString(),
    rendition,
    isRenditionPending: !isOwn && isRenditionPending(rendition, row.createdAt),
    likeCount: Number(row.likeCount),
    commentCount: Number(row.commentCount),
    isLiked: row.isLiked
  }
}

export async function listPosts(viewerId: string, options: { cursor?: string, authorId?: string }): Promise<Page<PostSummary>> {
  const where = and(
    beforeCursor(schema.posts.createdAt, schema.posts.id, options.cursor),
    options.authorId ? eq(schema.posts.authorId, options.authorId) : undefined
  )
  const rows = await fetchPosts(viewerId, where, PAGE_SIZE + 1)
  const hasMore = rows.length > PAGE_SIZE
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const last = pageRows.at(-1)
  return {
    items: pageRows.map(row => toSummary(row, viewerId)),
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null
  }
}

export async function getPost(id: string, viewerId: string): Promise<PostSummary | null> {
  const [row] = await fetchPosts(viewerId, eq(schema.posts.id, id), 1)
  return row ? toSummary(row, viewerId) : null
}

export async function listComments(postId: string, viewerId: string): Promise<CommentSummary[]> {
  const viewerTone = await getViewerTone(viewerId)
  const rows = await useDb()
    .select({
      id: schema.comments.id,
      authorId: schema.comments.authorId,
      originalText: schema.comments.originalText,
      createdAt: schema.comments.createdAt,
      author: userSummaryColumns,
      ...renditionColumns
    })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.authorId))
    .leftJoin(schema.renditions, renditionJoin('comment', schema.comments.id, viewerTone))
    .where(eq(schema.comments.postId, postId))
    .orderBy(schema.comments.createdAt, schema.comments.id)

  return rows.map((row) => {
    const isOwn = row.authorId === viewerId
    const rendition = isOwn ? null : toRendition(row)
    return {
      id: row.id,
      author: row.author,
      originalText: isOwn ? row.originalText : null,
      isOwn,
      createdAt: row.createdAt.toISOString(),
      rendition,
      isRenditionPending: !isOwn && isRenditionPending(rendition, row.createdAt)
    }
  })
}
