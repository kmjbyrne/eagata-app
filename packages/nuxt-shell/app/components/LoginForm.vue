<script setup lang="ts">
import type { SignInError } from '../../shared/contracts/auth'

const { public: { signInLabel, signInProvider } } = useRuntimeConfig()
const { shell: { brand } } = useAppConfig()
const route = useRoute()

const messages: Record<SignInError, string> = {
  'unavailable': 'Sign-in isn\'t available right now. Try again in a few minutes.',
  'expired': 'This sign-in expired. Start again.',
  'cancelled': 'Sign-in was cancelled.',
  'provider': 'The sign-in provider could not confirm who you are. Try again.',
  'not-invited': 'This account hasn\'t been set up yet. Ask an administrator for access.',
  'email-not-verified': 'Your email isn\'t verified with the sign-in provider, so it can\'t be used here.',
  'identity-mismatch': 'This email is linked to a different account at the sign-in provider.',
  'deactivated': 'This account has been deactivated.'
}
const error = computed(() => messages[route.query.error as SignInError])
</script>

<template>
  <div class="flex w-full max-w-sm flex-col items-center gap-6">
    <div class="flex flex-col items-center gap-2 text-center">
      <img
        v-if="brand.logo"
        :src="brand.logo"
        alt=""
        class="mb-2 size-16 object-contain"
      >
      <h1 class="text-3xl font-bold text-highlighted">
        {{ brand.name }}
      </h1>
      <p class="text-sm text-muted">
        {{ brand.tagline }}
      </p>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="error"
    />

    <div class="flex w-full flex-col items-center gap-3">
      <UButton
        :label="signInLabel"
        to="/api/auth/login"
        external
        block
        size="xl"
        color="neutral"
        variant="outline"
        class="justify-center gap-3 rounded-lg py-3 font-semibold"
      >
        <template #leading>
          <ProviderLogo
            :provider="signInProvider"
            class="size-5"
          />
        </template>
      </UButton>
      <p class="text-center text-xs text-muted">
        Accounts are set up by an administrator. If yours isn't yet, signing in
        will tell you so.
      </p>
    </div>
  </div>
</template>
