<script setup lang="ts">
const { logout } = useAuth()
const toast = useToast()

async function handleSaved() {
  toast.add({ title: '語氣已更新', color: 'success' })
  await navigateTo('/')
}
</script>

<template>
  <div class="space-y-10 px-4 py-4">
    <section>
      <h1 class="page-title text-lg">
        語氣設定
      </h1>
      <div class="mt-4">
        <ToneSettingsForm
          submit-label="儲存"
          @saved="handleSaved"
        />
      </div>
    </section>

    <USeparator />

    <UButton
      color="neutral"
      variant="outline"
      icon="i-mingcute-exit-door-line"
      label="登出"
      @click="logout"
    />
  </div>
</template>
