<script setup lang="ts">
/** 貼文與留言共用的作者列：顯示名稱、username、相對時間；自己的內容多一個刪除選單。 */
const props = defineProps<{
  author: UserSummary
  createdAt: string
  canDelete: boolean
}>()
const emit = defineEmits<{ delete: [] }>()

const authorPath = computed(() => `/users/${props.author.username}`)
const menuItems = [{
  label: '刪除',
  icon: 'i-mingcute-delete-2-line',
  color: 'error' as const,
  onSelect: () => emit('delete')
}]
</script>

<template>
  <div class="flex items-start justify-between gap-2">
    <div class="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-sm">
      <NuxtLink
        class="truncate font-semibold hover:underline"
        :to="authorPath"
      >
        {{ author.displayName }}
      </NuxtLink>
      <span class="truncate font-mono text-xs text-muted">@{{ author.username }}</span>
      <span class="text-muted">·</span>
      <time
        class="text-muted"
        :datetime="createdAt"
      >{{ formatRelativeTime(createdAt) }}</time>
    </div>
    <UDropdownMenu
      v-if="canDelete"
      :items="menuItems"
      :content="{ align: 'end' }"
    >
      <UButton
        class="-mr-2 -mt-1"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-mingcute-more-1-line"
        aria-label="更多"
      />
    </UDropdownMenu>
  </div>
</template>
