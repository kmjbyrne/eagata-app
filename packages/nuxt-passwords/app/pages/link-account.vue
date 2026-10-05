<script setup lang="ts">
import type { PendingLinkResponse } from '../../shared/contracts/passwords'

definePageMeta({ layout: false })
useHead({ title: 'Link your account' })

const { data: pending } = await useFetch<PendingLinkResponse>('/api/auth/link')
const { refresh } = useMe()
const password = ref('')
const error = ref<string>()
const loading = ref(false)

async function submit() {
  loading.value = true
  error.value = undefined
  try {
    await $fetch('/api/auth/link', { method: 'POST', body: { password: password.value } })
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
  <PasswordPage
    v-if="pending"
    title="Link your account"
  >
    <div class="flex flex-col items-center gap-3 text-center text-sm text-muted">
      <ProviderLogo
        :provider="pending.provider"
        class="size-8"
      />
      <p>
        An account already exists for <strong class="text-highlighted">{{ pending.email }}</strong>.
        Enter its password once to link it. After that, you sign straight in.
      </p>
    </div>
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
        label="Link and sign in"
        block
        size="lg"
        :loading="loading"
      />
      <ULink
        to="/forgot-password"
        class="self-center text-xs text-muted"
      >
        Forgot your password?
      </ULink>
    </form>
  </PasswordPage>
  <PasswordPage
    v-else
    title="This sign-in expired"
  >
    <UButton
      to="/login"
      label="Back to sign in"
      block
      size="lg"
    />
  </PasswordPage>
</template>
