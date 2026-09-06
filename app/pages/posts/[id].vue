<script setup lang="ts">
import { FetchError } from 'ofetch'

const route = useRoute()
const toast = useToast()

const postId = route.params.id as string

const { data: post, status: postStatus, error: postError } = await useAsyncData(`post-${postId}`, () => $fetch<PostSummary>(`/api/posts/${postId}`), { server: false, getCachedData: () => undefined })
const { data: comments } = await useAsyncData(`post-${postId}-comments`, () => $fetch<CommentSummary[]>(`/api/posts/${postId}/comments`), { server: false, default: () => [], getCachedData: () => undefined })

const isNotFound = computed(() => postError.value instanceof FetchError && postError.value.status === 404)
const isLoadingPost = computed(() => postStatus.value === 'pending' && !post.value)

function handleLiked(result: LikeResult) {
  if (post.value) post.value = { ...post.value, ...result }
}

async function handleDeletedPost() {
  toast.add({ title: '貼文已刪除', color: 'success' })
  await navigateTo('/', { replace: true })
}

function handleDeletedComment(id: string) {
  comments.value = comments.value.filter(comment => comment.id !== id)
  if (post.value) post.value = { ...post.value, commentCount: Math.max(0, post.value.commentCount - 1) }
}

async function handleSubmitComment(text: string, done: (isSuccess: boolean) => void) {
  try {
    const created = await $fetch<CommentSummary>(`/api/posts/${postId}/comments`, { method: 'POST', body: { text } satisfies TextCreate })
    comments.value = [...comments.value, created]
    if (post.value) post.value = { ...post.value, commentCount: post.value.commentCount + 1 }
    done(true)
  } catch {
    done(false)
    toast.add({ title: '留言失敗，請再試一次', color: 'error' })
  }
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 px-2 py-2">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-mingcute-arrow-left-line"
        aria-label="返回"
        to="/"
      />
      <h1 class="page-title text-base">
        貼文
      </h1>
    </div>

    <UEmpty
      v-if="isNotFound"
      class="py-16"
      icon="i-mingcute-file-forbid-line"
      title="貼文不存在"
      description="可能已經被作者刪除了。"
      :actions="[{ label: '回動態牆', to: '/' }]"
    />

    <PostListSkeleton
      v-else-if="isLoadingPost"
      :count="1"
    />

    <template v-else-if="post">
      <PostCard
        :post="post"
        detailed
        :has-replies-below="comments.length > 0"
        @liked="handleLiked"
        @deleted="handleDeletedPost"
      />

      <section class="pb-4">
        <TransitionGroup
          v-if="comments.length"
          name="list"
          tag="ul"
          class="relative"
        >
          <CommentItem
            v-for="(comment, index) in comments"
            :key="comment.id"
            :comment="comment"
            :has-thread-line="index < comments.length - 1"
            @deleted="handleDeletedComment"
          />
        </TransitionGroup>
        <p
          v-else
          class="px-4 py-6 text-center text-sm text-muted"
        >
          還沒有留言
        </p>
      </section>

      <div class="px-4 py-4">
        <TextComposer
          placeholder="留個言…"
          submit-label="送出"
          @submit="handleSubmitComment"
        />
      </div>
    </template>
  </div>
</template>
