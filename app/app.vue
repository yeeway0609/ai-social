<script setup lang="ts">
// 頁面自訂標題時接上站名；沒設時只顯示站名，避免變成「不痛 Tone · 不痛 Tone」
useHead({
  titleTemplate: title => title && title !== '不痛 Tone' ? `${title} · 不痛 Tone` : '不痛 Tone'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
