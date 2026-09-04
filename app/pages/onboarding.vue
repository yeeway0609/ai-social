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
    <h1 class="mt-1 text-2xl font-semibold tracking-tight">
      先選一個語氣
    </h1>
    <p class="mt-2 text-muted">
      別人寫的每一句話，都會先換成這個語氣再給你看。你自己寫的永遠是原文。隨時可以在設定裡改。
    </p>
    <div class="mt-8">
      <ToneSettingsForm submit-label="開始使用" @saved="handleSaved" />
    </div>
  </div>
</template>
