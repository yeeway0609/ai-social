<script setup lang="ts">
import { AI_PROVIDER_CAPABILITIES, isAllowedBaseUrl, OUTPUT_TOKENS_RANGE, TEMPERATURE_RANGE } from '#shared/utils/ai'

const { logout } = useAuth()
const toast = useToast()
const credentialWarning = useCredentialWarning()

const { credential, hint, hasOwnCredential, save: saveOwnCredential, clear: clearOwnCredential } = useOwnCredential()
const { invalidateAll } = useRenditionQueue()

const provider = ref<AiProvider>('anthropic')
const apiKey = ref('')
const model = ref('')
const baseUrl = ref('')
const temperature = ref<number | null>(null)
const maxOutputTokens = ref<number | null>(null)

const providerItems = AI_PROVIDERS.map(id => ({ label: AI_PROVIDER_LABELS[id], value: id }))
const capabilities = computed(() => AI_PROVIDER_CAPABILITIES[provider.value])
const supportsTemperature = computed(() => capabilities.value.supportsTemperature)
const isBaseUrlValid = computed(() => !capabilities.value.requiresBaseUrl || isAllowedBaseUrl(baseUrl.value.trim()))
const isModelValid = computed(() => !capabilities.value.requiresModel || model.value.trim().length > 0)
const isTemperatureValid = computed(() => temperature.value === null || (temperature.value >= TEMPERATURE_RANGE.min && temperature.value <= TEMPERATURE_RANGE.max))
const isMaxOutputTokensValid = computed(() => maxOutputTokens.value === null || (maxOutputTokens.value >= OUTPUT_TOKENS_RANGE.min && maxOutputTokens.value <= OUTPUT_TOKENS_RANGE.max))
// 相容端點多半不驗 key，隨便一串也能用，所以長度門檻放寬
const canSaveKey = computed(() => apiKey.value.trim().length >= (capabilities.value.requiresBaseUrl ? 1 : 20) && isBaseUrlValid.value && isModelValid.value && isTemperatureValid.value && isMaxOutputTokensValid.value)

async function handleSaved() {
  toast.add({ title: '語氣已更新', color: 'success' })
  await navigateTo('/')
}

function handleSubmitKey() {
  saveOwnCredential({
    provider: provider.value,
    apiKey: apiKey.value.trim(),
    model: model.value.trim() || undefined,
    temperature: supportsTemperature.value && temperature.value !== null ? temperature.value : undefined,
    maxOutputTokens: maxOutputTokens.value ?? undefined,
    baseUrl: capabilities.value.requiresBaseUrl ? baseUrl.value.trim() : undefined
  })
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
      <p class="label-mono text-muted">
        Settings
      </p>
      <h1 class="page-title mt-1 text-2xl">
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
        <h2 class="page-title text-lg">
          自備 API 金鑰
        </h2>
        <p class="mt-1 text-sm text-muted">
          改寫預設用團隊共用額度；用完時填入自己的金鑰就能繼續，也才能使用自訂語氣偏好。
        </p>
      </div>

      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-mingcute-safe-shield-2-line"
        title="金鑰只存在你的瀏覽器"
        description="金鑰存在這個裝置的瀏覽器儲存空間，不會寫進我們的資料庫；每次改寫時隨請求送到伺服器轉交模型供應商，伺服器用完即丟、不記錄。換裝置或清除瀏覽資料需要重填。"
      />

      <div
        v-if="hasOwnCredential && credential"
        class="flex items-center justify-between rounded-sm border border-accented px-3 py-2 text-sm"
      >
        <span class="min-w-0">
          {{ AI_PROVIDER_LABELS[credential.provider] }} <span class="font-mono text-muted">…{{ hint }}</span>
          <span class="block truncate text-xs text-muted">
            {{ credential.model || '預設模型' }}<template v-if="credential.baseUrl"> @ {{ credential.baseUrl }}</template><template v-if="credential.temperature !== undefined">・temperature {{ credential.temperature }}</template><template v-if="credential.maxOutputTokens !== undefined">・最多 {{ credential.maxOutputTokens }} tokens</template>
          </span>
        </span>
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-mingcute-delete-2-line"
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
        <UFormField
          v-if="capabilities.requiresBaseUrl"
          label="API base URL"
          description="任何 OpenAI 相容服務（vLLM、Ollama、LM Studio…），通常以 /v1 結尾。部署在雲端的伺服器連不到你的區域網路，本機開發才打得到內網位址。"
          :error="baseUrl && !isBaseUrlValid ? '只接受 http／https 網址' : undefined"
        >
          <UInput
            v-model="baseUrl"
            class="w-full"
            type="url"
            autocomplete="off"
            placeholder="https://your-endpoint.example.com/v1"
          />
        </UFormField>
        <UInput
          v-model="model"
          class="w-full"
          autocomplete="off"
          :placeholder="capabilities.requiresModel ? '模型名稱（必填，見該服務的 /v1/models）' : '模型名稱（留空用預設，例如 claude-haiku-4-5、gpt-5-mini、meta-llama/llama-3.3-70b-instruct:free）'"
        />
        <div class="grid grid-cols-2 gap-3">
          <UFormField
            v-if="supportsTemperature"
            label="temperature"
            :hint="`${TEMPERATURE_RANGE.min}–${TEMPERATURE_RANGE.max}`"
            :error="isTemperatureValid ? undefined : '超出範圍'"
          >
            <UInput
              v-model.number="temperature"
              class="w-full"
              type="number"
              step="0.1"
              :min="TEMPERATURE_RANGE.min"
              :max="TEMPERATURE_RANGE.max"
              placeholder="預設"
            />
          </UFormField>
          <UFormField
            label="輸出上限（tokens）"
            :hint="`${OUTPUT_TOKENS_RANGE.min}–${OUTPUT_TOKENS_RANGE.max}`"
            :error="isMaxOutputTokensValid ? undefined : '超出範圍'"
          >
            <UInput
              v-model.number="maxOutputTokens"
              class="w-full"
              type="number"
              step="64"
              :min="OUTPUT_TOKENS_RANGE.min"
              :max="OUTPUT_TOKENS_RANGE.max"
              placeholder="預設 1024"
            />
          </UFormField>
        </div>
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
      icon="i-mingcute-exit-door-line"
      label="登出"
      @click="logout"
    />
  </div>
</template>
