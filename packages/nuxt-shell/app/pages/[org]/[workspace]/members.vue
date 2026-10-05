<script setup lang="ts">
import type { WorkspaceRoleValue } from '../../../../shared/contracts/orgs'
import type { WorkspaceMemberResponse } from '../../../../shared/contracts/workspaces'

const { org, workspace } = useCurrentWorkspace()
if (!org.value || !workspace.value) {
  throw createError({ statusCode: 404, statusMessage: 'Workspace not found' })
}
useHead({ title: () => `Members · ${workspace.value?.name}` })

const toast = useToast()
const { me } = useMe()
const { refresh: refreshOrgs } = useOrgs()
const path = computed(() => `/api/orgs/${org.value!.org.slug}/workspaces/${workspace.value!.slug}/members`)
const { data: members, refresh } = await useFetch<WorkspaceMemberResponse[]>(path, { default: () => [], headers: useRequestHeaders(['cookie']) })

const isOwner = computed(() => workspace.value?.role === 'owner')
const roles: { label: string, value: WorkspaceRoleValue }[] = [
  { label: 'Owner', value: 'owner' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' }
]

const email = ref('')
const role = ref<WorkspaceRoleValue>('editor')
const adding = ref(false)

const messageOf = (error: unknown) => (error as { data?: { message?: string } }).data?.message ?? (error as Error).message

async function act(work: () => Promise<unknown>, done: string) {
  try {
    await work()
    await refresh()
    toast.add({ title: done, color: 'success' })
  } catch (error) {
    toast.add({ title: messageOf(error), color: 'error' })
  }
}

async function add() {
  adding.value = true
  await act(() => $fetch(path.value, { method: 'POST', body: { email: email.value, role: role.value } }), `Shared with ${email.value}`)
  email.value = ''
  adding.value = false
}

const changeRole = (member: WorkspaceMemberResponse, value: WorkspaceRoleValue) =>
  act(() => $fetch(`${path.value}/${member.user.id}`, { method: 'PATCH', body: { role: value } }), `${member.user.displayName} is now ${value === 'owner' ? 'an' : 'a'} ${value}`)

const remove = (member: WorkspaceMemberResponse) =>
  act(() => $fetch(`${path.value}/${member.user.id}`, { method: 'DELETE' }), `Removed ${member.user.displayName}`)

async function leave() {
  try {
    await $fetch(`${path.value}/${me.value!.id}`, { method: 'DELETE' })
    await refreshOrgs()
    await navigateTo('/')
  } catch (error) {
    toast.add({ title: messageOf(error), color: 'error' })
  }
}
</script>

<template>
  <UDashboardPanel id="workspace-members">
    <template #header>
      <UDashboardNavbar title="Members">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <UPageCard
          v-if="isOwner"
          title="Share this workspace"
          description="Add someone who has an account, by their email."
          variant="subtle"
        >
          <form
            class="flex flex-wrap items-end gap-2"
            @submit.prevent="add"
          >
            <UFormField
              label="Email"
              class="min-w-56 flex-1"
            >
              <UInput
                v-model="email"
                type="email"
                required
                class="w-full"
              />
            </UFormField>
            <UFormField label="Role">
              <USelect
                v-model="role"
                :items="roles"
                class="w-32"
              />
            </UFormField>
            <UButton
              type="submit"
              label="Add"
              :loading="adding"
              :disabled="!email"
            />
          </form>
        </UPageCard>

        <UPageCard variant="subtle">
          <ul class="divide-y divide-default">
            <li
              v-for="member in members"
              :key="member.user.id"
              class="flex items-center justify-between gap-4 py-2"
            >
              <UUser
                :name="member.user.displayName"
                :description="member.user.email"
                :avatar="{ src: member.user.avatarUrl ?? undefined, alt: member.user.displayName }"
              />
              <div class="flex items-center gap-2">
                <USelect
                  v-if="isOwner"
                  :model-value="member.role"
                  :items="roles"
                  class="w-32"
                  @update:model-value="changeRole(member, $event as WorkspaceRoleValue)"
                />
                <UBadge
                  v-else
                  :label="member.role"
                  color="neutral"
                  variant="subtle"
                />
                <UButton
                  v-if="isOwner && member.user.id !== me?.id"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  :aria-label="`Remove ${member.user.displayName}`"
                  @click="remove(member)"
                />
                <UButton
                  v-if="member.user.id === me?.id"
                  label="Leave"
                  color="neutral"
                  variant="ghost"
                  @click="leave"
                />
              </div>
            </li>
          </ul>
          <p
            v-if="!members.length"
            class="text-sm text-muted"
          >
            Nobody has been added to this workspace. Organization owners and admins manage it.
          </p>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
