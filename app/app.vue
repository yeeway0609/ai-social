<script setup lang="ts">
// 頁面自訂標題時接上站名；沒設時只顯示站名，避免變成「AI Social · AI Social」
useHead({
  titleTemplate: title => title && title !== 'AI Social' ? `${title} · AI Social` : 'AI Social'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
