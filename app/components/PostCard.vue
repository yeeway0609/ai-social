<script setup lang="ts">
const props = defineProps<{ post: PostSummary }>()
const emit = defineEmits<{
  deleted: [id: string]
  liked: [result: LikeResult]
}>()

const toast = useToast()

// 讚的樂觀更新需要本地副本；父層收到 liked 後回寫 props，這裡再跟著同步
const isLiked = ref(props.post.isLiked)
const likeCount = ref(props.post.likeCount)
const isTogglingLike = ref(false)
const isVisibleDeleteModal = ref(false)
const isDeleting = ref(false)

const postPath = computed(() => `/posts/${props.post.id}`)
const authorPath = computed(() => `/users/${props.post.author.handle}`)
const menuItems = [{
  label: '刪除',
  icon: 'i-lucide-trash-2',
  color: 'error' as const,
  onSelect: () => {
    isVisibleDeleteModal.value = true
  }
}]

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
    class="flex cursor-pointer gap-3 border-b border-default px-4 py-3 transition hover:bg-elevated/50"
    @click="handleClickCard"
  >
    <NuxtLink
      class="shrink-0"
      :to="authorPath"
      :aria-label="post.author.displayName"
    >
      <UserAvatar :user="post.author" />
    </NuxtLink>

    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <div class="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-sm">
          <NuxtLink
            class="truncate font-semibold hover:underline"
            :to="authorPath"
          >
            {{ post.author.displayName }}
          </NuxtLink>
          <span class="truncate text-muted">@{{ post.author.handle }}</span>
          <span class="text-muted">·</span>
          <time
            class="text-muted"
            :datetime="post.createdAt"
          >{{ formatRelativeTime(post.createdAt) }}</time>
        </div>
        <UDropdownMenu
          v-if="post.isOwn"
          :items="menuItems"
          :content="{ align: 'end' }"
        >
          <UButton
            class="-mr-2 -mt-1"
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-ellipsis"
            aria-label="更多"
          />
        </UDropdownMenu>
      </div>

      <div class="mt-1">
        <ContentBody
          kind="post"
          :content="post"
        />
      </div>

      <div class="-ml-2 mt-2 flex items-center gap-1">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          :class="isLiked ? 'text-red-500' : 'text-muted'"
          icon="i-lucide-heart"
          :ui="{ leadingIcon: isLiked ? 'fill-current' : '' }"
          :label="likeCount ? String(likeCount) : undefined"
          :aria-label="isLiked ? '收回讚' : '按讚'"
          :aria-pressed="isLiked"
          @click="handleClickLike"
        />
        <UButton
          class="text-muted"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-message-circle"
          :label="post.commentCount ? String(post.commentCount) : undefined"
          aria-label="留言"
          :to="postPath"
        />
      </div>
    </div>

    <UModal
      v-model:open="isVisibleDeleteModal"
      title="刪除這則貼文？"
      description="貼文底下的留言與讚會一起刪除，無法復原。"
    >
      <template #footer="{ close }">
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            label="取消"
            :disabled="isDeleting"
            @click="close"
          />
          <UButton
            color="error"
            label="刪除"
            :loading="isDeleting"
            @click="handleClickConfirmDelete"
          />
        </div>
      </template>
    </UModal>
  </article>
</template>
