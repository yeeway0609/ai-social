<script setup lang="ts">
const props = defineProps<{ comment: CommentSummary }>()
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
    <NuxtLink
      class="shrink-0"
      :to="authorPath"
      :aria-label="comment.author.displayName"
    >
      <UserAvatar
        :user="comment.author"
        size="sm"
      />
    </NuxtLink>

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
