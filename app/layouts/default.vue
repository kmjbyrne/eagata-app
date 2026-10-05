<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { org, workspace } = useCurrentWorkspace()

// The app's own navigation, inside the current workspace.
const items = computed<NavigationMenuItem[]>(() => {
  if (!org.value || !workspace.value) {
    return []
  }
  const base = `/${org.value.org.slug}/${workspace.value.slug}`
  return [
    { label: 'Home', icon: 'i-lucide-house', to: base, exact: true },
    { label: 'Members', icon: 'i-lucide-users', to: `${base}/members` },
    { label: 'Editor', icon: 'i-lucide-pen-line', to: `${base}/editor` },
    { label: 'Feedback', icon: 'i-lucide-message-square', to: `${base}/feedback` }
  ]
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <OrgSwitcher :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <WorkspaceSwitcher :collapsed="collapsed" />
        <UNavigationMenu
          :collapsed="collapsed"
          :items="items"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
