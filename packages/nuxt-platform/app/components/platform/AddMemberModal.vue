<script setup lang="ts">
const props = defineProps<{ orgSlug: string, memberIds: string[] }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ added: [] }>()

const api = useApi()
const act = usePlatformAction()
const { users } = usePlatformUsers()
const userId = ref<string>()
const role = ref<'owner' | 'admin' | 'member'>('member')
const roles = [{ label: 'Owner', value: 'owner' }, { label: 'Admin', value: 'admin' }, { label: 'Member', value: 'member' }]

const candidates = computed(() => users.value
  .filter(user => !props.memberIds.includes(user.id))
  .map(user => ({ label: user.displayName, description: user.deactivatedAt ? `${user.email} · deactivated` : user.email, value: user.id })))

watch(open, (isOpen) => {
  if (isOpen) {
    userId.value = undefined
    role.value = 'member'
  }
})

async function add() {
  const name = users.value.find(user => user.id === userId.value)?.displayName
  if (await act(() => api(`/api/protected/organizations/${props.orgSlug}/members`, { method: 'POST', body: { userId: userId.value!, role: role.value } }), `Added ${name} as ${role.value}`)) {
    open.value = false
    emit('added')
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add member"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="add"
      >
        <UFormField
          label="User"
          required
        >
          <USelectMenu
            v-model="userId"
            :items="candidates"
            value-key="value"
            placeholder="Pick a user"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Role">
          <USelect
            v-model="role"
            :items="roles"
            class="w-full"
          />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Add"
            :disabled="!userId"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
