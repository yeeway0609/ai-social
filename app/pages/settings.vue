<script setup lang="ts">
const { logout } = useAuth()
const toast = useToast()
const credentialWarning = useCredentialWarning()

const { credential, hint, hasOwnCredential, save: saveOwnCredential, clear: clearOwnCredential } = useOwnCredential()
const { invalidateAll } = useRenditionQueue()

const provider = ref<AiProvider>('anthropic')
const apiKey = ref('')

const providerItems = AI_PROVIDERS.map(id => ({ label: AI_PROVIDER_LABELS[id], value: id }))
const canSaveKey = computed(() => apiKey.value.trim().length >= 20)

async function handleSaved() {
  toast.add({ title: '語氣已更新', color: 'success' })
  await navigateTo('/')
}

function handleSubmitKey() {
  saveOwnCredential({ provider: provider.value, apiKey: apiKey.value.trim() })
  apiKey.value = ''
  credentialWarning.dismiss()
  // 之後的改寫改走自己的金鑰，已載入的內容重新來一次
  invalidateAll()
  toast.add({ title: '金鑰已存進這個瀏覽器', color: 'success' })
}

function handleClickDeleteKey() {
  clearOwnCredential()
  invalidateAll()
}
</script>

<template>
  <div class="space-y-10 px-4 py-6">
    <section>
      <h1 class="text-xl font-semibold">
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

    <section class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold">
          自備 API 金鑰
        </h2>
        <p class="mt-1 text-sm text-muted">
          改寫預設用團隊共用額度；用完時填入自己的金鑰就能繼續，也才能使用自訂語氣偏好。
        </p>
      </div>

      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-lucide-shield-check"
        title="金鑰只存在你的瀏覽器"
        description="金鑰存在這個裝置的瀏覽器儲存空間，不會寫進我們的資料庫；每次改寫時隨請求送到伺服器轉交模型供應商，伺服器用完即丟、不記錄。換裝置或清除瀏覽資料需要重填。"
      />

      <div
        v-if="hasOwnCredential && credential"
        class="flex items-center justify-between rounded-lg border border-default px-3 py-2 text-sm"
      >
        <span>{{ AI_PROVIDER_LABELS[credential.provider] }} <span class="font-mono text-muted">…{{ hint }}</span></span>
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-trash-2"
          aria-label="從這個瀏覽器移除金鑰"
          @click="handleClickDeleteKey"
        />
      </div>

      <form
        class="space-y-3"
        @submit.prevent="handleSubmitKey"
      >
        <URadioGroup
          v-model="provider"
          orientation="horizontal"
          :items="providerItems"
        />
        <UInput
          v-model="apiKey"
          class="w-full"
          type="password"
          autocomplete="off"
          placeholder="貼上 API key"
        />
        <UButton
          type="submit"
          :disabled="!canSaveKey"
          :label="hasOwnCredential ? '更換金鑰' : '存到這個瀏覽器'"
        />
      </form>
    </section>

    <USeparator />

    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-log-out"
      label="登出"
      @click="logout"
    />
  </div>
</template>
