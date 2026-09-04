<script setup lang="ts">
const { data: health } = await useFetch('/api/health', { key: 'health', server: false })
</script>

<template>
  <main class="mx-auto max-w-xl p-8">
    <h1 class="text-2xl font-semibold">
      AI Social
    </h1>
    <p class="mt-2 text-muted">
      API：{{ health?.status ?? '…' }}
    </p>
  </main>
</template>
