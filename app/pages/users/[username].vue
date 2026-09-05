<script setup lang="ts">
import { FetchError } from 'ofetch'

const SKELETON_KEYS = ['a', 'b', 'c']

const route = useRoute()
const { user: currentUser } = useAuth()

const username = route.params.username as string

const { data: profile, error: profileError } = await useAsyncData(`user-${username}`, () => $fetch<UserSummary>(`/api/users/${username}`), { server: false })
const { items: posts, sentinel, isLoadingFirstPage, isLoadingMore, isRefreshing, hasMore, refreshLatest, removePost, updatePost } = await usePostFeed(`user-${username}-posts`, `/api/users/${username}/posts`)

const isNotFound = computed(() => profileError.value instanceof FetchError && profileError.value.status === 404)
const isOwnProfile = computed(() => !!profile.value && profile.value.id === currentUser.value?.id)
</script>

<template>
  <div>
    <UEmpty
      v-if="isNotFound"
      class="py-16"
      icon="i-mingcute-user-x-line"
      title="使用者不存在"
      :actions="[{ label: '回動態牆', to: '/' }]"
    />

    <template v-else>
      <header class="flex items-start justify-between gap-4 border-b border-default px-4 py-6">
        <div
          v-if="profile"
          class="flex min-w-0 items-center gap-4"
        >
          <UserAvatar
            :user="profile"
            size="lg"
          />
          <div class="min-w-0">
            <h1 class="truncate font-display text-2xl font-bold tracking-tight">
              {{ profile.displayName }}
            </h1>
            <p class="truncate text-sm text-muted">
              @{{ profile.username }}
            </p>
          </div>
        </div>
        <div
          v-else
          class="flex items-center gap-4"
        >
          <USkeleton class="size-16 rounded-full" />
          <div class="space-y-2">
            <USkeleton class="h-5 w-32" />
            <USkeleton class="h-4 w-20" />
          </div>
        </div>
        <UButton
          v-if="isOwnProfile"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-mingcute-settings-3-line"
          label="設定"
          to="/settings"
        />
      </header>

      <div class="flex items-center justify-between px-4 py-2">
        <h2 class="text-sm font-medium text-muted">
          貼文
        </h2>
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
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

      <p
        v-else-if="posts.length === 0"
        class="py-16 text-center text-sm text-muted"
      >
        {{ isOwnProfile ? '你還沒發過文' : '這個人還沒發過文' }}
      </p>

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
            name="i-mingcute-loading-3-line"
          />
          <span
            v-else-if="!hasMore"
            class="text-xs text-muted"
          >沒有更多貼文了</span>
        </div>
      </template>
    </template>
  </div>
</template>
