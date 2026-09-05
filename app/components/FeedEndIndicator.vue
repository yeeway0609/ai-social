<script setup lang="ts">
/** 無限捲動列表底部：載入下一頁時轉圈，沒有更多時提示；父層把哨兵 ref 掛在包這個元件的容器上。 */
defineProps<{
  isLoadingMore: boolean
  hasMore: boolean
}>()
</script>

<template>
  <UIcon
    v-if="isLoadingMore"
    class="size-5 animate-spin text-muted"
    name="i-mingcute-loading-3-line"
  />
  <span
    v-else-if="!hasMore"
    class="text-xs text-muted"
  >沒有更多貼文了</span>
</template>
