<script setup lang="ts">
/** 品牌標誌：粉紅圓角方塊上的白色全罩式安全帽（來自設計稿點陣圖，非向量）。 */
withDefaults(defineProps<{ size?: string }>(), { size: 'size-6' })
</script>

<template>
  <img
    src="/logo.png"
    alt=""
    aria-hidden="true"
    class="shrink-0 rounded-[22%]"
    :class="size"
  >
</template>
