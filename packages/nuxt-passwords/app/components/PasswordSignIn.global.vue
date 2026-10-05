<script setup lang="ts">
const email = ref('')
const password = ref('')
const error = ref<string>()
const loading = ref(false)
const { refresh } = useMe()

async function submit() {
  loading.value = true
  error.value = undefined
  try {
    await $fetch('/api/auth/password', { method: 'POST', body: { email: email.value, password: password.value } })
    await refresh()
    await navigateTo('/')
  } catch (failure) {
    error.value = failureMessage(failure)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <USeparator
      label="or with your password"
      :ui="{ label: 'text-xs text-muted' }"
    />
    <form
      class="flex flex-col gap-3"
      @submit.prevent="submit"
    >
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :description="error"
      />
      <UInput
        v-model="email"
        type="email"
        placeholder="Email"
        autocomplete="username"
        required
        size="lg"
        class="w-full"
      />
      <UInput
        v-model="password"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
        required
        size="lg"
        class="w-full"
      />
      <UButton
        type="submit"
        label="Sign in"
        block
        size="lg"
        :loading="loading"
      />
      <ULink
        to="/forgot-password"
        class="self-center text-xs text-muted"
      >
        Forgot or never set a password?
      </ULink>
    </form>
  </div>
</template>
