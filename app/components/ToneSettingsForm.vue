<script setup lang="ts">
import { FetchError } from 'ofetch'

/** 引導設定與設定頁共用的語氣表單；儲存後讓所有已載入的內容重新改寫。 */
const props = defineProps<{ submitLabel: string }>()
const emit = defineEmits<{ saved: [user: CurrentUser] }>()

const { user, saveSettings } = useAuth()
const { invalidateAll } = useRenditionQueue()
const toast = useToast()

// 自訂指示只給有自備金鑰的人：它的改寫不進共用快取，每次都燒讀者自己的額度
const { data: credentials } = await useAsyncData('my-credentials', () => $fetch<CredentialSummary[]>('/api/me/credentials'), { server: false, default: () => [] })

const tone = ref(user.value?.tone ?? 'gentle')
const customInstruction = ref(user.value?.customInstruction ?? '')
const isSubmitting = ref(false)

const hasOwnCredential = computed(() => credentials.value.length > 0)
const isCustomAllowed = computed(() => tone.value !== ORIGINAL_TONE && hasOwnCredential.value)
const remaining = computed(() => MAX_CUSTOM_INSTRUCTION_LENGTH - customInstruction.value.length)
const customInstructionHint = computed(() => {
  if (tone.value === ORIGINAL_TONE) return '選「不改寫」時不會套用。'
  if (!hasOwnCredential.value) return '需要先在設定頁填入自己的 API 金鑰才能使用，因為這種改寫會用你自己的額度。'
  return '用自己的話補充，例如「多用台語詞」「不要用驚嘆號」。只影響語氣，不會改變內容的意思。'
})

async function handleSubmitSettings() {
  isSubmitting.value = true
  try {
    const saved = await saveSettings({
      tone: tone.value,
      customInstruction: isCustomAllowed.value && customInstruction.value.trim() ? customInstruction.value.trim() : null
    })
    invalidateAll()
    emit('saved', saved)
  } catch (err) {
    toast.add({
      title: err instanceof FetchError && err.data?.statusMessage === 'credential_required' ? '要先設定自備金鑰才能用自訂語氣偏好' : '儲存失敗，請再試一次',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form
    class="space-y-8"
    @submit.prevent="handleSubmitSettings"
  >
    <fieldset class="space-y-3">
      <legend class="mb-3 text-sm font-medium">
        你想用什麼語氣讀別人的話？
      </legend>
      <label
        v-for="option in TONES"
        :key="option.id"
        class="flex cursor-pointer gap-3 rounded-lg border p-3 transition"
        :class="tone === option.id ? 'border-primary bg-primary/5' : 'border-default hover:bg-elevated'"
      >
        <input
          v-model="tone"
          class="mt-1 accent-primary"
          type="radio"
          name="tone"
          :value="option.id"
        >
        <span class="min-w-0 flex-1">
          <span class="block font-medium">{{ option.label }}</span>
          <span class="block text-sm text-muted">{{ option.description }}</span>
          <span class="mt-1.5 block rounded bg-elevated px-2 py-1 text-sm">「{{ option.sample }}」</span>
        </span>
      </label>
    </fieldset>

    <UFormField
      label="額外的語氣偏好（選填）"
      name="customInstruction"
      :description="customInstructionHint"
      :hint="`${remaining}`"
    >
      <UTextarea
        v-model="customInstruction"
        class="w-full"
        :rows="3"
        autoresize
        :maxlength="MAX_CUSTOM_INSTRUCTION_LENGTH"
        :disabled="!isCustomAllowed"
        placeholder="例如：像在跟好朋友說話那樣"
      />
    </UFormField>

    <UButton
      class="w-full justify-center"
      type="submit"
      size="lg"
      :loading="isSubmitting"
      :label="props.submitLabel"
    />
  </form>
</template>
