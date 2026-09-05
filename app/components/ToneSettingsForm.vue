<script setup lang="ts">
/** 引導設定與設定頁共用的語氣表單；儲存後重抓所有列表，讓內容換成新語氣的改寫。 */
const props = defineProps<{ submitLabel: string }>()
const emit = defineEmits<{ saved: [user: CurrentUser] }>()

const { user, saveSettings } = useAuth()
const toast = useToast()

const tone = ref<ToneId>(user.value?.tone ?? DEFAULT_TONE.id)
const isSubmitting = ref(false)

async function handleSubmitSettings() {
  isSubmitting.value = true
  try {
    const saved = await saveSettings({ tone: tone.value })
    await refreshNuxtData()
    emit('saved', saved)
  } catch {
    toast.add({ title: '儲存失敗，請再試一次', color: 'error' })
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
      <legend class="sr-only">
        語氣
      </legend>
      <label
        v-for="option in TONES"
        :key="option.id"
        class="relative flex cursor-pointer gap-3 rounded-sm border p-3 transition-all duration-(--duration-base) ease-out-soft active:scale-[0.99]"
        :class="tone === option.id ? 'border-primary bg-primary/5 glow-primary-soft' : 'border-accented hover:bg-elevated'"
      >
        <input
          v-model="tone"
          class="sr-only"
          type="radio"
          name="tone"
          :value="option.id"
        >
        <span
          class="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-(--duration-base)"
          :class="tone === option.id ? 'border-primary bg-primary text-inverted' : 'border-default'"
          aria-hidden="true"
        >
          <UIcon
            v-if="tone === option.id"
            name="i-mingcute-check-line"
            class="size-3.5 animate-pop-in"
          />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block font-medium">{{ option.label }}</span>
          <span class="block text-sm text-muted">{{ option.description }}</span>
          <span class="mt-1.5 block border-l-2 border-primary/60 bg-elevated px-2 py-1 text-sm">「{{ option.sample }}」</span>
        </span>
      </label>
    </fieldset>

    <UButton
      class="w-full justify-center"
      type="submit"
      size="lg"
      :loading="isSubmitting"
      :label="props.submitLabel"
    />
  </form>
</template>
