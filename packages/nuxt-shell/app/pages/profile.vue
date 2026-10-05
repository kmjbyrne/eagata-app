<script setup lang="ts">
useHead({ title: 'Profile' })

const { me } = useMe()
const { orgs } = useOrgs()
</script>

<template>
  <UDashboardPanel id="profile">
    <template #header>
      <UDashboardNavbar title="Profile">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="me"
        class="mx-auto flex w-full max-w-2xl flex-col gap-6"
      >
        <UPageCard variant="subtle">
          <UUser
            :name="me.displayName"
            :description="me.email"
            :avatar="{ src: me.avatarUrl ?? undefined, alt: me.displayName }"
            size="xl"
          />
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-if="me.isPlatformAdmin"
              label="Platform admin"
              icon="i-lucide-shield"
              variant="subtle"
            />
            <UBadge
              v-for="identity in me.identities"
              :key="identity.provider"
              :label="`Signs in with ${identity.provider}`"
              icon="i-lucide-key-round"
              color="neutral"
              variant="subtle"
            />
          </div>
        </UPageCard>

        <UPageCard
          title="Organizations"
          variant="subtle"
        >
          <ul class="divide-y divide-default">
            <li
              v-for="entry in orgs"
              :key="entry.org.id"
              class="flex items-center justify-between gap-4 py-2"
            >
              <span class="flex items-center gap-2">
                <UIcon :name="entry.org.isPersonal ? 'i-lucide-user' : 'i-lucide-building-2'" />
                {{ entry.org.name }}
              </span>
              <span class="text-sm text-muted">
                {{ entry.org.isPersonal ? 'Personal' : (entry.role ?? `${entry.workspaces.length} shared workspace${entry.workspaces.length === 1 ? '' : 's'}`) }}
              </span>
            </li>
          </ul>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
