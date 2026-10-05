<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Forgot password' })

const email = ref('')
const sent = ref(false)
const error = ref<string>()
const loading = ref(false)

async function submit() {
  loading.value = true
  error.value = undefined
  try {
    await $fetch('/api/auth/password/forgot', { method: 'POST', body: { email: email.value } })
    sent.value = true
  } catch (failure) {
    error.value = failureMessage(failure)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PasswordPage
    v-if="sent"
    title="Check your email"
    description="If an account exists for that email, we've sent a link to set a password. It works once and expires in 30 minutes."
  >
    <UButton
      to="/login"
      label="Back to sign in"
      color="neutral"
      variant="outline"
      block
      size="lg"
    />
  </PasswordPage>
  <PasswordPage
    v-else
    title="Set a password"
    description="Forgot yours, or never had one? Enter your email and we'll send a link to set it."
  >
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
      <UButton
        type="submit"
        label="Send link"
        block
        size="lg"
        :loading="loading"
      />
      <ULink
        to="/login"
        class="self-center text-xs text-muted"
      >
        Back to sign in
      </ULink>
    </form>
  </PasswordPage>
</template>
