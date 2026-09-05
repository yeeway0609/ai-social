<script setup lang="ts">
const SKELETON_KEYS = ['a', 'b', 'c']

const { items: posts, sentinel, isLoadingFirstPage, isLoadingMore, isRefreshing, hasMore, refreshLatest, removePost, updatePost } = await usePostFeed('feed', '/api/posts')
</script>

<template>
  <div>
    <div class="flex items-center justify-between px-4 py-3">
      <div>
        <p class="label-mono text-muted">
          01 / Feed
        </p>
        <h1 class="page-title mt-1 text-2xl">
          動態牆
        </h1>
      </div>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-mingcute-refresh-2-line"
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
      icon="i-mingcute-quill-pen-line"
      title="還沒有人發文"
      description="成為第一個開口的人吧。"
      :actions="[{ label: '發文', to: '/compose', icon: 'i-mingcute-quill-pen-line' }]"
    />

    <template v-else>
      <TransitionGroup
        name="list"
        tag="div"
        class="relative"
      >
        <PostCard
          v-for="post in posts"
          :key="post.id"
          :post="post"
          @deleted="removePost"
          @liked="updatePost(post.id, $event)"
        />
      </TransitionGroup>
      <div
        ref="sentinel"
        class="flex justify-center py-6"
      >
        <UIcon
          v-if="isLoadingMore"
          class="size-5 animate-spin text-muted"
          name="i-mingcute-loading-3-line"
        />
        <span
          v-else-if="!hasMore"
          class="text-xs text-muted"
        >沒有更多貼文了</span>
      </div>
    </template>
  </div>
</template>
