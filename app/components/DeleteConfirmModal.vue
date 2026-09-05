<script setup lang="ts">
defineProps<{
  title: string
  description: string
  isDeleting: boolean
}>()
const emit = defineEmits<{ confirm: [] }>()
const isOpen = defineModel<boolean>('open', { required: true })
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
    :description="description"
  >
    <template #footer="{ close }">
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="取消"
          :disabled="isDeleting"
          @click="close"
        />
        <UButton
          color="error"
          label="刪除"
          :loading="isDeleting"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
