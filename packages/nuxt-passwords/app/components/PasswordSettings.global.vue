<script setup lang="ts">
import type { PasswordStatusResponse } from '../../shared/contracts/passwords'

const toast = useToast()
const { data: status, refresh } = await useFetch<PasswordStatusResponse>('/api/me/password')

const current = ref('')
// Read-only until focused, so the browser doesn't fill it on load: confirming
// the password should be a deliberate act.
const editingCurrent = ref(false)
const password = ref('')
const error = ref<string>()
const saving = ref(false)

async function save() {
  saving.value = true
  error.value = undefined
  try {
    await $fetch('/api/me/password', {
      method: 'PUT',
      body: { password: password.value, ...(status.value?.hasPassword ? { current: current.value } : {}) }
    })
    toast.add({ title: status.value?.hasPassword ? 'Password changed' : 'Password set', color: 'success' })
    current.value = ''
    password.value = ''
    await refresh()
  } catch (failure) {
    error.value = failureMessage(failure)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UPageCard
    v-if="status"
    title="Password"
    :description="status.hasPassword ? 'Confirm your current password before setting a new one.' : 'You sign in without a password. Set one to sign in with your email too.'"
    variant="subtle"
  >
    <form
      class="flex max-w-xs flex-col gap-3"
      @submit.prevent="save"
    >
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :description="error"
      />
      <UInput
        v-if="status.hasPassword"
        v-model="current"
        type="password"
        placeholder="Current password"
        autocomplete="off"
        :readonly="!editingCurrent"
        required
        @focus="editingCurrent = true"
      />
      <UInput
        v-model="password"
        type="password"
        placeholder="New password, at least 10 characters"
        autocomplete="new-password"
        required
      />
      <UButton
        type="submit"
        :label="status.hasPassword ? 'Update' : 'Set password'"
        :loading="saving"
        class="w-fit self-start"
      />
    </form>
  </UPageCard>
</template>
