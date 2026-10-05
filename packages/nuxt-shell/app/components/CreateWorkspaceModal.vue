<script setup lang="ts">
import type { WorkspaceResponse } from '../../shared/contracts/workspaces'

const props = defineProps<{ orgSlug: string }>()
const open = defineModel<boolean>('open', { default: false })

const { refresh } = useOrgs()
const name = ref('')
const slug = ref('')
const slugError = ref<string>()
const formError = ref<string>()
const saving = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    name.value = ''
    slug.value = ''
    slugError.value = undefined
    formError.value = undefined
  }
})

async function create() {
  saving.value = true
  slugError.value = undefined
  formError.value = undefined
  try {
    const workspace = await $fetch<WorkspaceResponse>(`/api/orgs/${props.orgSlug}/workspaces`, {
      method: 'POST',
      body: { name: name.value, slug: slug.value || undefined }
    })
    await refresh()
    open.value = false
    await navigateTo(`/${props.orgSlug}/${workspace.slug}`)
  } catch (error) {
    const { data, message } = (error as { data?: { message?: string, data?: { error?: string } } }).data ?? {}
    const text = data ? message : (error as Error).message
    if (data?.error === 'SlugTakenError' || data?.error === 'InvalidSlugError') {
      slugError.value = text
    } else {
      formError.value = text
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Create workspace"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="create"
      >
        <UFormField
          label="Name"
          name="name"
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
        <UAlert
          v-if="formError"
          color="error"
          variant="subtle"
          :description="formError"
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
            :disabled="!name.trim()"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
