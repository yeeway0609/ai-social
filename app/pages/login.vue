<script setup lang="ts">
import { FetchError } from 'ofetch'

definePageMeta({ layout: 'bare' })

const { login } = useAuth()

const form = reactive<LoginRequest>({ username: '', password: '' })
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

async function handleSubmitLogin() {
  isSubmitting.value = true
  errorMessage.value = null
  try {
    const user = await login({ username: form.username.trim().toLowerCase(), password: form.password })
    await navigateTo(user.onboardedAt ? '/' : '/onboarding')
  } catch (err) {
    errorMessage.value = err instanceof FetchError && err.status === 401
      ? '帳號或密碼不正確'
      : '登入失敗，請稍後再試'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <p class="label-mono text-muted">
      00 / 登入
    </p>
    <div class="mt-3 flex items-center gap-3">
      <BrandLogo
        class="text-primary"
        size="size-12"
      />
      <h1 class="page-title text-4xl normal-case">
        不痛 Tone
      </h1>
    </div>
    <p class="mt-3 text-muted">
      每個人用自己選的語氣，讀同一個世界。
    </p>

    <form
      class="mt-10 space-y-4"
      @submit.prevent="handleSubmitLogin"
    >
      <UFormField
        label="帳號"
        name="username"
      >
        <UInput
          v-model="form.username"
          class="w-full"
          autocomplete="username"
          autocapitalize="none"
          placeholder="username"
          size="lg"
        />
      </UFormField>
      <UFormField
        label="密碼"
        name="password"
      >
        <UInput
          v-model="form.password"
          class="w-full"
          type="password"
          autocomplete="current-password"
          size="lg"
        />
      </UFormField>
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        :title="errorMessage"
      />
      <UButton
        class="w-full justify-center"
        type="submit"
        size="lg"
        :loading="isSubmitting"
        :disabled="!form.username || !form.password"
      >
        登入
      </UButton>
    </form>

    <p class="mt-6 text-center text-xs text-muted">
      帳號由團隊發放，沒有註冊功能。
    </p>
  </div>
</template>
