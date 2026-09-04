<script setup lang="ts">
import { FetchError } from 'ofetch'

const { logout } = useAuth()
const toast = useToast()
const credentialWarning = useCredentialWarning()

const { data: credentials, refresh: refreshCredentials } = await useAsyncData('my-credentials', () => $fetch<CredentialSummary[]>('/api/me/credentials'), { server: false, default: () => [] })

const provider = ref<AiProvider>('anthropic')
const apiKey = ref('')
const isSavingKey = ref(false)

const PROVIDER_LABELS: Record<AiProvider, string> = { anthropic: 'Anthropic', openai: 'OpenAI' }
const providerItems = AI_PROVIDERS.map(id => ({ label: PROVIDER_LABELS[id], value: id }))

async function handleSaved() {
  toast.add({ title: '語氣已更新', color: 'success' })
  await navigateTo('/')
}

async function handleSubmitKey() {
  isSavingKey.value = true
  try {
    await $fetch('/api/me/credentials', { method: 'POST', body: { provider: provider.value, apiKey: apiKey.value.trim() } })
    apiKey.value = ''
    credentialWarning.dismiss()
    await refreshCredentials()
    toast.add({ title: '金鑰已儲存', color: 'success' })
  } catch (err) {
    toast.add({ title: err instanceof FetchError && err.status === 400 ? '金鑰格式不正確' : '儲存失敗', color: 'error' })
  } finally {
    isSavingKey.value = false
  }
}

async function handleClickDeleteKey(target: AiProvider) {
  await $fetch(`/api/me/credentials/${target}`, { method: 'DELETE' })
  await refreshCredentials()
}
</script>

<template>
  <div class="space-y-10 px-4 py-6">
    <section>
      <h1 class="text-xl font-semibold">
        語氣設定
      </h1>
      <div class="mt-4">
        <ToneSettingsForm submit-label="儲存" @saved="handleSaved" />
      </div>
    </section>

    <USeparator />

    <section class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold">
          自備 API 金鑰
        </h2>
        <p class="mt-1 text-sm text-muted">
          改寫預設用團隊共用額度；用完時填入自己的金鑰就能繼續。金鑰加密存放、只顯示尾四碼。
        </p>
      </div>

      <ul v-if="credentials.length" class="space-y-2">
        <li v-for="credential in credentials" :key="credential.provider" class="flex items-center justify-between rounded-lg border border-default px-3 py-2 text-sm">
          <span>{{ PROVIDER_LABELS[credential.provider] }}　<span class="font-mono text-muted">…{{ credential.hint }}</span></span>
          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-trash-2" aria-label="刪除金鑰" @click="handleClickDeleteKey(credential.provider)" />
        </li>
      </ul>

      <form class="space-y-3" @submit.prevent="handleSubmitKey">
        <URadioGroup v-model="provider" orientation="horizontal" :items="providerItems" />
        <UInput v-model="apiKey" class="w-full" type="password" autocomplete="off" placeholder="貼上 API key" />
        <UButton type="submit" :loading="isSavingKey" :disabled="apiKey.trim().length < 20" label="儲存金鑰" />
      </form>
    </section>

    <USeparator />

    <UButton color="neutral" variant="outline" icon="i-lucide-log-out" label="登出" @click="logout" />
  </div>
</template>
