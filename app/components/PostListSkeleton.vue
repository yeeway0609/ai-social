<script setup lang="ts">
/** 貼文卡形狀的佔位：作者列＋兩行內容；列表首頁與貼文頁載入中共用。 */
withDefaults(defineProps<{ count?: number }>(), { count: 3 })
</script>

<template>
  <div
    v-for="index in count"
    :key="index"
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
