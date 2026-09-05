import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm'
import { schema, useDb } from '../db'
import { getViewer, renditionColumns, renditionJoin, toContentSummary, type Viewer } from './ai/render'
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
function fetchPosts(viewer: Viewer, where: SQL | undefined, limit: number) {
  return useDb()
    .select(postColumns(viewer.id))
    .from(schema.posts)
    .innerJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
    .leftJoin(schema.renditions, renditionJoin('post', schema.posts.id, viewer.tone))
    .where(where)
    .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
    .limit(limit)
}

function toPostSummary(row: PostRow, viewer: Viewer, firstComment: CommentSummary | null): PostSummary {
  return {
    ...toContentSummary(row, viewer),
    likeCount: Number(row.likeCount),
    commentCount: Number(row.commentCount),
    isLiked: row.isLiked,
    firstComment
  }
}

/** 一頁貼文各自最早的一則留言，一次查完；沒留言的貼文不會出現在結果裡。 */
async function fetchFirstComments(viewer: Viewer, postIds: string[]): Promise<Map<string, CommentSummary>> {
  if (postIds.length === 0) return new Map()
  const rows = await useDb()
    .selectDistinctOn([schema.comments.postId], {
      postId: schema.comments.postId,
      id: schema.comments.id,
      authorId: schema.comments.authorId,
      originalText: schema.comments.originalText,
      createdAt: schema.comments.createdAt,
      author: userSummaryColumns,
      ...renditionColumns
    })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.authorId))
    .leftJoin(schema.renditions, renditionJoin('comment', schema.comments.id, viewer.tone))
    .where(inArray(schema.comments.postId, postIds))
    .orderBy(schema.comments.postId, schema.comments.createdAt, schema.comments.id)

  return new Map(rows.map(row => [row.postId, toContentSummary(row, viewer)]))
}

export async function listPosts(viewerId: string, options: { cursor?: string, authorId?: string }): Promise<Page<PostSummary>> {
  const viewer = await getViewer(viewerId)
  const where = and(
    beforeCursor(schema.posts.createdAt, schema.posts.id, options.cursor),
    options.authorId ? eq(schema.posts.authorId, options.authorId) : undefined
  )
  const rows = await fetchPosts(viewer, where, PAGE_SIZE + 1)
  const hasMore = rows.length > PAGE_SIZE
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const last = pageRows.at(-1)
  const firstComments = await fetchFirstComments(viewer, pageRows.map(row => row.id))
  return {
    items: pageRows.map(row => toPostSummary(row, viewer, firstComments.get(row.id) ?? null)),
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null
  }
}

/** 貼文頁底下會列出全部留言，不需要預覽。 */
export async function getPost(id: string, viewerId: string): Promise<PostSummary | null> {
  const viewer = await getViewer(viewerId)
  const [row] = await fetchPosts(viewer, eq(schema.posts.id, id), 1)
  return row ? toPostSummary(row, viewer, null) : null
}

export async function listComments(postId: string, viewerId: string): Promise<CommentSummary[]> {
  const viewer = await getViewer(viewerId)
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
    .leftJoin(schema.renditions, renditionJoin('comment', schema.comments.id, viewer.tone))
    .where(eq(schema.comments.postId, postId))
    .orderBy(schema.comments.createdAt, schema.comments.id)

  return rows.map(row => toContentSummary(row, viewer))
}
