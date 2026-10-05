<script setup lang="ts">
definePageMeta({ layout: 'platform', middleware: 'platform' })
useHead({ title: 'Organizations · Platform' })

const { orgs } = usePlatformOrgs()
const creating = ref(false)
const showPersonal = ref(false)
const shown = computed(() => orgs.value.filter(row => showPersonal.value || !row.org.isPersonal))
</script>

<template>
  <UDashboardPanel id="platform-organizations">
    <template #header>
      <UDashboardNavbar title="Organizations">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            label="Create organization"
            icon="i-lucide-plus"
            @click="creating = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <USwitch
          v-model="showPersonal"
          label="Show personal organizations"
        />
        <UPageCard variant="subtle">
          <ul class="divide-y divide-default">
            <li
              v-for="row in shown"
              :key="row.org.id"
            >
              <NuxtLink
                :to="`/platform/organizations/${row.org.slug}`"
                class="flex items-center justify-between gap-4 py-3 hover:text-highlighted"
              >
                <span class="flex items-center gap-2">
                  <UIcon :name="row.org.isPersonal ? 'i-lucide-user' : 'i-lucide-building-2'" />
                  <span class="font-medium">{{ row.org.name }}</span>
                  <span class="text-sm text-muted">/{{ row.org.slug }}</span>
                </span>
                <span class="text-sm text-muted">
                  {{ row.memberCount }} member{{ row.memberCount === 1 ? '' : 's' }} · {{ row.workspaceCount }} workspace{{ row.workspaceCount === 1 ? '' : 's' }}
                </span>
              </NuxtLink>
            </li>
          </ul>
          <p
            v-if="!shown.length"
            class="text-sm text-muted"
          >
            No organizations yet.
          </p>
        </UPageCard>
      </div>
      <PlatformCreateOrgModal v-model:open="creating" />
    </template>
  </UDashboardPanel>
</template>
