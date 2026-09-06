<script setup lang="ts">
const { items: posts, sentinel, isLoadingFirstPage, isLoadingMore, isRefreshing, hasMore, refreshLatest, removePost, updatePost } = await usePostFeed('feed', '/api/posts')
</script>

<template>
  <div>
    <div class="flex items-center justify-between px-4 py-2">
      <h1 class="page-title text-lg">
        動態牆
      </h1>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-mingcute-refresh-2-line"
        aria-label="載入新貼文"
        :loading="isRefreshing"
        @click="refreshLatest()"
      />
    </div>

    <PostListSkeleton v-if="isLoadingFirstPage" />

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
        <FeedEndIndicator
          :is-loading-more="isLoadingMore"
          :has-more="hasMore"
        />
      </div>
    </template>
  </div>
</template>
