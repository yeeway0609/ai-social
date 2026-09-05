<script setup lang="ts">
const toast = useToast()

async function handleSaved() {
  toast.add({ title: '語氣已更新', color: 'success' })
  await navigateTo('/')
}
</script>

<template>
  <div class="px-4 py-4">
    <h1 class="page-title text-lg">
      語氣設定
    </h1>
    <div class="mt-4">
      <ToneSettingsForm
        submit-label="儲存"
        @saved="handleSaved"
      />
    </div>
  </div>
</template>
