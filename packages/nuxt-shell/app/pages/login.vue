<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Sign in' })

const { shell } = useAppConfig()
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-4 p-4">
    <LoginForm />
    <component
      :is="name"
      v-for="name in shell.loginExtras"
      :key="name"
    />
  </div>
</template>
