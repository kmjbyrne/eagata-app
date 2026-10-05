<script setup lang="ts">
definePageMeta({ layout: 'platform', middleware: 'platform' })
useHead({ title: 'Users · Platform' })

const { users, refresh } = usePlatformUsers()
const creating = ref(false)

async function created(user: { id: string }) {
  await refresh()
  await navigateTo(`/platform/users/${user.id}`)
}
</script>

<template>
  <UDashboardPanel id="platform-users">
    <template #header>
      <UDashboardNavbar title="Users">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            label="Create user"
            icon="i-lucide-user-plus"
            @click="creating = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPageCard
        variant="subtle"
        class="mx-auto w-full max-w-3xl"
      >
        <ul class="divide-y divide-default">
          <li
            v-for="user in users"
            :key="user.id"
          >
            <NuxtLink
              :to="`/platform/users/${user.id}`"
              class="flex items-center justify-between gap-4 py-2"
            >
              <UUser
                :name="user.displayName"
                :description="user.email"
                :avatar="{ src: user.avatarUrl ?? undefined, alt: user.displayName }"
              />
              <span class="flex flex-wrap justify-end gap-1">
                <UBadge
                  v-if="user.isPlatformAdmin"
                  label="Platform admin"
                  icon="i-lucide-shield"
                  variant="subtle"
                />
                <UBadge
                  v-if="user.deactivatedAt"
                  label="Deactivated"
                  color="error"
                  variant="subtle"
                />
                <UBadge
                  v-if="!user.hasSignedIn"
                  label="Not signed in yet"
                  color="neutral"
                  variant="subtle"
                />
              </span>
            </NuxtLink>
          </li>
        </ul>
      </UPageCard>
      <PlatformCreateUserModal
        v-model:open="creating"
        @created="created"
      />
    </template>
  </UDashboardPanel>
</template>
