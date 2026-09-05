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

const initial = computed(() => Array.from(props.user.displayName)[0] ?? props.user.username[0] ?? '?')
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold select-none"
    :class="[SIZE_CLASSES[size], avatarColorFor(user.username)]"
    :title="user.displayName"
  >
    {{ initial }}
  </span>
</template>
