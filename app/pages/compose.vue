<script setup lang="ts">
const toast = useToast()

async function handleSubmitPost(text: string, done: (isSuccess: boolean) => void) {
  try {
    await $fetch<PostSummary>('/api/posts', { method: 'POST', body: { text } satisfies TextCreate })
    done(true)
    toast.add({ title: '已發布', color: 'success' })
    await navigateTo('/')
  } catch {
    done(false)
    toast.add({ title: '發布失敗，請再試一次', color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-4 px-4 py-4">
    <h1 class="page-title text-lg">
      發文
    </h1>
    <TextComposer
      placeholder="有什麼想說的？"
      submit-label="發布"
      autofocus
      @submit="handleSubmitPost"
    />
  </div>
</template>
