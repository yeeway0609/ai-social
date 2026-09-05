<script setup lang="ts">
const props = withDefaults(defineProps<{
  post: PostSummary
  /** 貼文頁才攤開語意相似度，列表只有幅度分級。 */
  detailed?: boolean
  /** 貼文頁底下接著留言列表時，頭像的串接線要一路延伸到留言、不畫底線。 */
  hasRepliesBelow?: boolean
}>(), { detailed: false, hasRepliesBelow: false })
const emit = defineEmits<{
  deleted: [id: string]
  liked: [result: LikeResult]
}>()

const toast = useToast()

// 讚的樂觀更新需要本地副本；父層收到 liked 後回寫 props，這裡再跟著同步
const isLiked = ref(props.post.isLiked)
const likeCount = ref(props.post.likeCount)
const isTogglingLike = ref(false)
// 只有「按下去變成讚」才播爆開動畫，取消讚或從伺服器同步回來都不播
const isHeartBursting = ref(false)
const isVisibleDeleteModal = ref(false)
const isDeleting = ref(false)

const postPath = computed(() => `/posts/${props.post.id}`)
const authorPath = computed(() => `/users/${props.post.author.username}`)
// 列表上把第一則留言串在貼文底下；貼文頁底下有完整留言列表，不再預覽
const previewComment = computed(() => props.detailed ? null : props.post.firstComment)
const hasThreadLine = computed(() => props.detailed ? props.hasRepliesBelow : previewComment.value !== null)

watch(() => [props.post.isLiked, props.post.likeCount] as const, ([liked, count]) => {
  isLiked.value = liked
  likeCount.value = count
})

function handleClickCard(e: MouseEvent) {
  // 卡片內的連結與按鈕各有自己的目的地，只有點在空白處或正文才進貼文頁
  if ((e.target as HTMLElement).closest('a, button, textarea, input')) return
  navigateTo(postPath.value)
}

async function handleClickLike() {
  if (isTogglingLike.value) return
  const previous = { isLiked: isLiked.value, likeCount: likeCount.value }
  isLiked.value = !previous.isLiked
  likeCount.value = previous.likeCount + (previous.isLiked ? -1 : 1)
  isHeartBursting.value = isLiked.value
  isTogglingLike.value = true
  try {
    const result = await $fetch<LikeResult>(`/api/posts/${props.post.id}/like`, { method: 'POST' })
    isLiked.value = result.isLiked
    likeCount.value = result.likeCount
    emit('liked', result)
  } catch {
    isLiked.value = previous.isLiked
    likeCount.value = previous.likeCount
    toast.add({ title: '按讚失敗，請再試一次', color: 'error' })
  } finally {
    isTogglingLike.value = false
  }
}

async function handleClickConfirmDelete() {
  isDeleting.value = true
  try {
    await $fetch(`/api/posts/${props.post.id}`, { method: 'DELETE' })
    isVisibleDeleteModal.value = false
    emit('deleted', props.post.id)
  } catch {
    toast.add({ title: '刪除失敗，請再試一次', color: 'error' })
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <article
    class="cursor-pointer px-4 py-3 transition-colors duration-(--duration-base) hover:bg-elevated/60"
    :class="!hasRepliesBelow && 'border-b border-default'"
    @click="handleClickCard"
  >
    <div class="flex gap-3">
      <div class="flex shrink-0 flex-col items-center">
        <NuxtLink
          :to="authorPath"
          :aria-label="post.author.displayName"
        >
          <UserAvatar :user="post.author" />
        </NuxtLink>
        <span
          v-if="hasThreadLine"
          class="thread-line"
          aria-hidden="true"
        />
      </div>

      <div class="min-w-0 flex-1">
        <AuthorLine
          :author="post.author"
          :created-at="post.createdAt"
          :can-delete="post.isOwn"
          @delete="isVisibleDeleteModal = true"
        />

        <div class="mt-1">
          <ContentBody
            kind="post"
            :content="post"
            :show-semantic-similarity="detailed"
          />
        </div>

        <div class="-ml-2 mt-2 flex items-center gap-1">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            class="active:scale-90 transition-transform duration-(--duration-fast)"
            :class="isLiked ? 'text-pulse' : 'text-muted hover:text-pulse'"
            :aria-label="isLiked ? '收回讚' : '按讚'"
            :aria-pressed="isLiked"
            @click="handleClickLike"
          >
            <UIcon
              :name="isLiked ? 'i-mingcute-heart-fill' : 'i-mingcute-heart-line'"
              class="size-5 shrink-0"
              :class="isHeartBursting && 'animate-heart-burst'"
              @animationend="isHeartBursting = false"
            />
            <span class="relative inline-grid min-w-[1ch] tabular-nums">
              <Transition name="swap">
                <span
                  v-if="likeCount"
                  :key="likeCount"
                  class="col-start-1 row-start-1"
                >{{ likeCount }}</span>
              </Transition>
            </span>
          </UButton>
          <UButton
            class="text-muted transition-transform duration-(--duration-fast) hover:text-primary active:scale-90"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-mingcute-chat-2-line"
            :label="post.commentCount ? String(post.commentCount) : undefined"
            aria-label="留言"
            :to="postPath"
          />
        </div>
      </div>
    </div>

    <div
      v-if="previewComment"
      class="mt-2 flex gap-3"
    >
      <div class="flex w-10 shrink-0 justify-center">
        <NuxtLink
          :to="`/users/${previewComment.author.username}`"
          :aria-label="previewComment.author.displayName"
        >
          <UserAvatar
            :user="previewComment.author"
            size="sm"
          />
        </NuxtLink>
      </div>
      <div class="min-w-0 flex-1">
        <AuthorLine
          :author="previewComment.author"
          :created-at="previewComment.createdAt"
          :can-delete="false"
        />
        <div class="mt-1">
          <ContentBody
            kind="comment"
            :content="previewComment"
            compact
          />
        </div>
      </div>
    </div>

    <DeleteConfirmModal
      v-model:open="isVisibleDeleteModal"
      title="刪除這則貼文？"
      description="貼文底下的留言與讚會一起刪除，無法復原。"
      :is-deleting="isDeleting"
      @confirm="handleClickConfirmDelete"
    />
  </article>
</template>
