<script setup lang="ts">
import type { PlatformOrg } from '../../../shared/contracts/platform'

const open = defineModel<boolean>('open', { default: false })

const api = useApi()
const { users, refresh: refreshUsers } = usePlatformUsers()
const name = ref('')
const slug = ref('')
const ownerUserId = ref<string>()
const slugError = ref<string>()
const error = ref<string>()
const saving = ref(false)
const creatingUser = ref(false)

const owners = computed(() => users.value
  .filter(user => !user.deactivatedAt)
  .map(user => ({ label: user.displayName, description: user.email, value: user.id })))

watch(open, (isOpen) => {
  if (isOpen) {
    name.value = ''
    slug.value = ''
    ownerUserId.value = undefined
    slugError.value = undefined
    error.value = undefined
  }
})

async function userCreated(user: { id: string }) {
  await refreshUsers()
  ownerUserId.value = user.id
}

async function create() {
  saving.value = true
  slugError.value = undefined
  error.value = undefined
  try {
    const org = await api<PlatformOrg>('/api/protected/organizations', {
      method: 'POST',
      body: { name: name.value, ownerUserId: ownerUserId.value!, slug: slug.value || undefined }
    })
    open.value = false
    await navigateTo(`/platform/organizations/${org.slug}`)
  } catch (failure) {
    const data = (failure as { data?: { message?: string, data?: { error?: string } } }).data
    const message = data?.message ?? (failure as Error).message
    if (['SlugTakenError', 'InvalidSlugError', 'ReservedSlugError'].includes(data?.data?.error ?? '')) {
      slugError.value = message
    } else {
      error.value = message
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Create organization"
    description="A company organization, with an owner and a General workspace."
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
            v-model="name"
            autofocus
            class="w-full"
          />
        </UFormField>
        <SlugInput
          v-model="slug"
          :name="name"
          :error="slugError"
        />
        <UFormField
          label="Owner"
          required
        >
          <div class="flex gap-2">
            <USelectMenu
              v-model="ownerUserId"
              :items="owners"
              value-key="value"
              placeholder="Pick a user"
              class="flex-1"
            />
            <UButton
              label="New user"
              icon="i-lucide-user-plus"
              color="neutral"
              variant="outline"
              @click="creatingUser = true"
            />
          </div>
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
            :disabled="!name.trim() || !ownerUserId"
          />
        </div>
      </form>
      <PlatformCreateUserModal
        v-model:open="creatingUser"
        @created="userCreated"
      />
    </template>
  </UModal>
</template>
