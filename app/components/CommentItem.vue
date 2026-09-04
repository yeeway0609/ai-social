<script setup lang="ts">
const props = defineProps<{ comment: CommentSummary }>()
const emit = defineEmits<{ deleted: [id: string] }>()

const toast = useToast()

const isVisibleDeleteModal = ref(false)
const isDeleting = ref(false)

const authorPath = computed(() => `/users/${props.comment.author.handle}`)
const menuItems = [{
  label: '刪除',
  icon: 'i-lucide-trash-2',
  color: 'error' as const,
  onSelect: () => {
    isVisibleDeleteModal.value = true
  }
}]

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
      <div class="flex items-start justify-between gap-2">
        <div class="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-sm">
          <NuxtLink
            class="truncate font-semibold hover:underline"
            :to="authorPath"
          >
            {{ comment.author.displayName }}
          </NuxtLink>
          <span class="truncate text-muted">@{{ comment.author.handle }}</span>
          <span class="text-muted">·</span>
          <time
            class="text-muted"
            :datetime="comment.createdAt"
          >{{ formatRelativeTime(comment.createdAt) }}</time>
        </div>
        <UDropdownMenu
          v-if="comment.isOwn"
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
          kind="comment"
          :content="comment"
        />
      </div>
    </div>

    <UModal
      v-model:open="isVisibleDeleteModal"
      title="刪除這則留言？"
      description="刪除後無法復原。"
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
  </li>
</template>
