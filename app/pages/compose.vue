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
  <div class="space-y-4 px-4 py-6">
    <h1 class="text-xl font-semibold">
      發文
    </h1>
    <TextComposer
      placeholder="有什麼想說的？"
      submit-label="發布"
      autofocus
      @submit="handleSubmitPost"
    />
    <p class="text-xs text-muted">
      送出的就是原文，不會被 AI 修改。
    </p>
  </div>
</template>
