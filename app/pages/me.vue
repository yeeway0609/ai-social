<script setup lang="ts">
/** 「我」分頁只是自己個人頁的捷徑；登入者由全域 middleware 保證存在。 */
const { user } = useAuth()

if (user.value) await navigateTo(`/users/${user.value.username}`, { replace: true })
</script>

<template>
  <div />
</template>
