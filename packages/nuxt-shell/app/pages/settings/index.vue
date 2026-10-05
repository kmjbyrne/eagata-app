<script setup lang="ts">
useHead({ title: 'Profile · Settings' })

const { me } = useMe()
const { orgs } = useOrgs()
</script>

<template>
  <div
    v-if="me"
    class="flex flex-col gap-6"
  >
    <UPageCard variant="subtle">
      <UUser
        :name="me.displayName"
        :description="me.email"
        :avatar="{ src: me.avatarUrl ?? undefined, alt: me.displayName }"
        size="xl"
      />
      <UBadge
        v-if="me.isPlatformAdmin"
        label="Platform admin"
        icon="i-lucide-shield"
        variant="subtle"
        class="self-start"
      />
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
