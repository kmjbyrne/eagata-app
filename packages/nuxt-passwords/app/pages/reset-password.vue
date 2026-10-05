<script setup lang="ts">
definePageMeta({ layout: false })
// The token is in the URL, so keep it out of Referer headers.
useHead({ title: 'Set a new password', meta: [{ name: 'referrer', content: 'no-referrer' }] })

const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const { refresh } = useMe()
const password = ref('')
const confirm = ref('')
const error = ref<string>()
const loading = ref(false)

onMounted(() => {
  // Out of the address bar and history once read.
  history.replaceState(history.state, '', route.path)
})

async function submit() {
  if (password.value !== confirm.value) {
    error.value = 'The passwords don\'t match.'
    return
  }
  loading.value = true
  error.value = undefined
  try {
    await $fetch('/api/auth/password/reset', { method: 'POST', body: { token, password: password.value } })
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
    v-if="token"
    title="Set a new password"
    description="At least 10 characters."
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
        v-model="password"
        type="password"
        placeholder="New password"
        autocomplete="new-password"
        required
        size="lg"
        class="w-full"
      />
      <UInput
        v-model="confirm"
        type="password"
        placeholder="Confirm new password"
        autocomplete="new-password"
        required
        size="lg"
        class="w-full"
      />
      <UButton
        type="submit"
        label="Set password and sign in"
        block
        size="lg"
        :loading="loading"
      />
      <ULink
        to="/forgot-password"
        class="self-center text-xs text-muted"
      >
        Ask for a new link
      </ULink>
    </form>
  </PasswordPage>
  <PasswordPage
    v-else
    title="This link is incomplete"
  >
    <UButton
      to="/forgot-password"
      label="Ask for a new link"
      block
      size="lg"
    />
  </PasswordPage>
</template>
