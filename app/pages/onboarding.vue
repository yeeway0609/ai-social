<script setup lang="ts">
definePageMeta({ layout: 'bare' })

const { user } = useAuth()

async function handleSaved() {
  await navigateTo('/')
}
</script>

<template>
  <div class="py-6">
    <p class="text-sm text-muted">
      嗨，{{ user?.displayName }}
    </p>
    <h1 class="page-title mt-1 text-3xl">
      先選一個語氣
    </h1>
    <p class="mt-2 text-muted">
      別人的話會用這個語氣呈現，你寫的永遠是原文。
    </p>
    <div class="mt-8">
      <ToneSettingsForm
        submit-label="開始使用"
        @saved="handleSaved"
      />
    </div>
  </div>
</template>
