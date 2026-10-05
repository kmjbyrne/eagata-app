<script setup lang="ts">
import type { PlatformUserSummary } from '../../../shared/contracts/platform'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [user: PlatformUserSummary] }>()

const api = useApi()
const displayName = ref('')
const email = ref('')
const error = ref<string>()
const saving = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    displayName.value = ''
    email.value = ''
    error.value = undefined
  }
})

async function create() {
  saving.value = true
  error.value = undefined
  try {
    const user = await api<PlatformUserSummary>('/api/protected/users', { method: 'POST', body: { displayName: displayName.value, email: email.value } })
    open.value = false
    emit('created', user)
  } catch (failure) {
    error.value = (failure as { data?: { message?: string } }).data?.message ?? (failure as Error).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Create user"
    description="They can sign in with this email. Their personal organization is created with them."
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="create"
      >
        <UFormField
          label="Name"
          required
        >
          <UInput
            v-model="displayName"
            autofocus
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Email"
          required
        >
          <UInput
            v-model="email"
            type="email"
            class="w-full"
          />
        </UFormField>
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          :description="error"
        />
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Create"
            :loading="saving"
            :disabled="!displayName.trim() || !email.trim()"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
