<script setup lang="ts">
import type { PlatformUserDetailResponse, PlatformUserSummary } from '../../../../shared/contracts/platform'

definePageMeta({ layout: 'platform', middleware: 'platform' })

const route = useRoute()
const api = useApi()
const act = usePlatformAction()
const { me } = useMe()
const { refresh: refreshUsers } = usePlatformUsers()
const id = computed(() => String(route.params.id))
const { data: detail, refresh, error } = await useAsyncData(() => `platform:user:${id.value}`, () => api<PlatformUserDetailResponse>(`/api/protected/users/${id.value}`))
useHead({ title: () => `${detail.value?.user.displayName ?? 'User'} · Platform` })

const isMe = computed(() => detail.value?.user.id === me.value?.id)

async function update(body: { isPlatformAdmin: boolean } | { deactivated: boolean }, done: string) {
  await act(() => api<PlatformUserSummary>(`/api/protected/users/${id.value}`, { method: 'PATCH', body }), done)
  await Promise.all([refresh(), refreshUsers()])
}

const setPlatformAdmin = (value: boolean) =>
  update({ isPlatformAdmin: value }, value ? 'Made a platform admin' : 'No longer a platform admin')

const setDeactivated = (value: boolean) =>
  update({ deactivated: value }, value ? 'Deactivated. Their sessions have ended.' : 'Reactivated, with their access as it was')
</script>

<template>
  <UDashboardPanel id="platform-user">
    <template #header>
      <UDashboardNavbar :title="detail?.user.displayName ?? 'User'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        title="This user can't be found"
      />
      <div
        v-else-if="detail"
        class="mx-auto flex w-full max-w-3xl flex-col gap-6"
      >
        <UPageCard variant="subtle">
          <UUser
            :name="detail.user.displayName"
            :description="detail.user.email"
            :avatar="{ src: detail.user.avatarUrl ?? undefined, alt: detail.user.displayName }"
            size="xl"
          />
          <p class="text-sm text-muted">
            {{ detail.user.hasSignedIn ? 'Has signed in.' : 'Hasn\'t signed in yet. Their account links on first sign-in with this email.' }}
          </p>
        </UPageCard>

        <UPageCard
          title="Access"
          variant="subtle"
        >
          <USwitch
            :model-value="detail.user.isPlatformAdmin"
            label="Platform admin"
            description="Runs the platform: organizations, members and users. Doesn't make them a member of any organization."
            @update:model-value="setPlatformAdmin"
          />
          <USwitch
            :model-value="Boolean(detail.user.deactivatedAt)"
            label="Deactivated"
            :description="isMe ? 'You can\'t deactivate yourself.' : 'Stops sign-in and ends their sessions. Nothing of theirs is removed.'"
            :disabled="isMe"
            @update:model-value="setDeactivated"
          />
        </UPageCard>

        <UPageCard
          title="Organizations"
          variant="subtle"
        >
          <ul class="divide-y divide-default">
            <li
              v-for="entry in detail.orgs"
              :key="entry.org.id"
            >
              <NuxtLink
                :to="`/platform/organizations/${entry.org.slug}`"
                class="flex items-center justify-between gap-4 py-2"
              >
                <span class="flex items-center gap-2">
                  <UIcon :name="entry.org.isPersonal ? 'i-lucide-user' : 'i-lucide-building-2'" />
                  {{ entry.org.name }}
                </span>
                <span class="text-sm text-muted">{{ entry.org.isPersonal ? 'Personal' : entry.role }}</span>
              </NuxtLink>
            </li>
          </ul>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
