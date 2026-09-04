<script setup lang="ts">
const SKELETON_KEYS = ['a', 'b', 'c']

const { items: posts, sentinel, isLoadingFirstPage, isLoadingMore, isRefreshing, hasMore, refreshLatest, removePost, updatePost } = await usePostFeed('feed', '/api/posts')
</script>

<template>
  <div>
    <div class="flex items-center justify-between px-4 py-3">
      <h1 class="text-xl font-semibold">
        動態牆
      </h1>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-refresh-cw"
        label="載入新貼文"
        :loading="isRefreshing"
        @click="refreshLatest"
      />
    </div>

    <template v-if="isLoadingFirstPage">
      <div
        v-for="key in SKELETON_KEYS"
        :key="key"
        class="flex gap-3 border-b border-default px-4 py-3"
      >
        <USkeleton class="size-10 shrink-0 rounded-full" />
        <div class="flex-1 space-y-2 py-1">
          <USkeleton class="h-4 w-1/3" />
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-4/5" />
        </div>
      </div>
    </template>

    <UEmpty
      v-else-if="posts.length === 0"
      class="py-16"
      icon="i-lucide-feather"
      title="還沒有人發文"
      description="成為第一個開口的人吧。"
      :actions="[{ label: '發文', to: '/compose', icon: 'i-lucide-pen-line' }]"
    />

    <template v-else>
      <PostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        @deleted="removePost"
        @liked="updatePost(post.id, $event)"
      />
      <div
        ref="sentinel"
        class="flex justify-center py-6"
      >
        <UIcon
          v-if="isLoadingMore"
          class="size-5 animate-spin text-muted"
          name="i-lucide-loader-circle"
        />
        <span
          v-else-if="!hasMore"
          class="text-xs text-muted"
        >沒有更多貼文了</span>
      </div>
    </template>
  </div>
</template>
