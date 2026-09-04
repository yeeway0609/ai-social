<script setup lang="ts">
const props = withDefaults(defineProps<{
  user: UserSummary
  size?: 'sm' | 'md' | 'lg'
}>(), { size: 'md' })

const SIZE_CLASSES = {
  sm: 'size-7 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-16 text-xl'
}

const initial = computed(() => Array.from(props.user.displayName)[0] ?? props.user.handle[0] ?? '?')
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none"
    :class="[SIZE_CLASSES[size], avatarColorFor(user.handle)]"
    :title="user.displayName"
  >
    {{ initial }}
  </span>
</template>
