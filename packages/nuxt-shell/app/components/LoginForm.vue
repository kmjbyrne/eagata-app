<script setup lang="ts">
import type { SignInError } from '../../shared/contracts/auth'

const { public: { signInLabel } } = useRuntimeConfig()
const route = useRoute()

const messages: Record<SignInError, string> = {
  'cancelled': 'Sign-in was cancelled.',
  'provider': 'The sign-in provider could not confirm who you are. Try again.',
  'email-not-verified': 'Your email isn\'t verified with the sign-in provider, so it can\'t be used here.',
  'identity-mismatch': 'This email is linked to a different account at the sign-in provider.',
  'deactivated': 'This account has been deactivated.'
}
const error = computed(() => messages[route.query.error as SignInError])
</script>

<template>
  <UPageCard
    title="Sign in"
    icon="i-lucide-log-in"
    class="w-full max-w-sm"
  >
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="error"
    />
    <UButton
      :label="signInLabel"
      to="/api/auth/login"
      external
      block
      size="lg"
      icon="i-lucide-arrow-right"
      trailing
    />
  </UPageCard>
</template>
