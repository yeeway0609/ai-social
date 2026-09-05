<script setup lang="ts">
/** 品牌標誌：側面的全罩式安全帽，面向右。殼吃 currentColor，鏡片與通風孔用頁面底色鏤空。 */
withDefaults(defineProps<{ size?: string }>(), { size: 'size-6' })
</script>

<template>
  <svg
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    :class="size"
  >
    <!-- 殼 -->
    <path
      d="M28 6C46 6 60 18 60 34V47c0 5-4 9-9 9H22C12 56 4 47 4 36V30C4 16 14 6 28 6Z"
      fill="currentColor"
    />
    <!-- 鏡片開口，開到殼的前緣 -->
    <path
      d="M31 22h33v14H36c-3 0-6-2-6-5v-4c0-3 1-5 1-5Z"
      fill="var(--ui-bg)"
    />
    <!-- 鏡片反光 -->
    <path
      d="M35 27h16"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      opacity="0.45"
    />
    <!-- 下巴與頂部通風孔 -->
    <path
      d="M42 46h12M42 50h8M22 14h8"
      stroke="var(--ui-bg)"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
</template>
