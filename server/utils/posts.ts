import { and, desc, eq, sql, type SQL } from 'drizzle-orm'
import { schema, useDb } from '../db'
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
    likeCount: db.$count(schema.likes, eq(schema.likes.postId, schema.posts.id)),
    commentCount: db.$count(schema.comments, eq(schema.comments.postId, schema.posts.id)),
    isLiked: sql<boolean>`exists (select 1 from ${schema.likes} where ${schema.likes.postId} = ${schema.posts.id} and ${schema.likes.userId} = ${viewerId})`
  }
}

type PostRow = Awaited<ReturnType<typeof fetchPosts>>[number]

async function fetchPosts(viewerId: string, where: SQL | undefined, limit: number) {
  return useDb()
    .select(postColumns(viewerId))
    .from(schema.posts)
    .innerJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
    .where(where)
    .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
    .limit(limit)
}

/** 他人的貼文不帶原文——前端只能拿到改寫版，或明確要求「顯示原文」。 */
function toSummary(row: PostRow, viewerId: string): PostSummary {
  const isOwn = row.authorId === viewerId
  return {
    id: row.id,
    author: row.author,
    originalText: isOwn ? row.originalText : null,
    isOwn,
    createdAt: row.createdAt.toISOString(),
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
  const rows = await useDb()
    .select({
      id: schema.comments.id,
      authorId: schema.comments.authorId,
      originalText: schema.comments.originalText,
      createdAt: schema.comments.createdAt,
      author: userSummaryColumns
    })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.authorId))
    .where(eq(schema.comments.postId, postId))
    .orderBy(schema.comments.createdAt, schema.comments.id)

  return rows.map((row) => {
    const isOwn = row.authorId === viewerId
    return {
      id: row.id,
      author: row.author,
      originalText: isOwn ? row.originalText : null,
      isOwn,
      createdAt: row.createdAt.toISOString()
    }
  })
}
