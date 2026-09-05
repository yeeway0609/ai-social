<script setup lang="ts">
const props = withDefaults(defineProps<{
  comment: CommentSummary
  /** 不是最後一則時，頭像下方的串接線要接到下一則留言。 */
  hasThreadLine?: boolean
}>(), { hasThreadLine: false })
const emit = defineEmits<{ deleted: [id: string] }>()

const toast = useToast()

const isVisibleDeleteModal = ref(false)
const isDeleting = ref(false)

const authorPath = computed(() => `/users/${props.comment.author.username}`)

async function handleClickConfirmDelete() {
  isDeleting.value = true
  try {
    await $fetch(`/api/comments/${props.comment.id}`, { method: 'DELETE' })
    isVisibleDeleteModal.value = false
    emit('deleted', props.comment.id)
  } catch {
    toast.add({ title: '刪除失敗，請再試一次', color: 'error' })
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <li class="flex gap-3 px-4 py-3">
    <!-- 留言頭像較小，外框撐到和貼文頭像同寬，串接線才會對齊 -->
    <div class="flex w-10 shrink-0 flex-col items-center">
      <NuxtLink
        :to="authorPath"
        :aria-label="comment.author.displayName"
      >
        <UserAvatar
          :user="comment.author"
          size="sm"
        />
      </NuxtLink>
      <span
        v-if="hasThreadLine"
        class="thread-line"
        aria-hidden="true"
      />
    </div>

    <div class="min-w-0 flex-1">
      <AuthorLine
        :author="comment.author"
        :created-at="comment.createdAt"
        :can-delete="comment.isOwn"
        @delete="isVisibleDeleteModal = true"
      />

      <div class="mt-1">
        <ContentBody
          kind="comment"
          :content="comment"
        />
      </div>
    </div>

    <DeleteConfirmModal
      v-model:open="isVisibleDeleteModal"
      title="刪除這則留言？"
      description="刪除後無法復原。"
      :is-deleting="isDeleting"
      @confirm="handleClickConfirmDelete"
    />
  </li>
</template>
