<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

useHead({ title: 'Settings' })

const { shell } = useAppConfig()

const tabs = computed<NavigationMenuItem[]>(() => [
  { label: 'Profile', icon: 'i-lucide-user', to: '/settings', exact: true },
  { label: 'Security', icon: 'i-lucide-shield', to: '/settings/security' },
  ...shell.settingsTabs
])
</script>

<template>
  <UDashboardPanel id="settings">
    <template #header>
      <UDashboardNavbar title="Settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <UNavigationMenu
          :items="tabs"
          highlight
          class="-mx-1 flex-1"
        />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
