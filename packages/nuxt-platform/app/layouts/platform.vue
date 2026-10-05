<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { platform } = useAppConfig()

const items: NavigationMenuItem[][] = [
  [
    { label: 'Organizations', icon: 'i-lucide-building-2', to: '/platform/organizations' },
    { label: 'Users', icon: 'i-lucide-users', to: '/platform/users' },
    ...platform.navItems
  ],
  [{ label: 'Back to the app', icon: 'i-lucide-arrow-left', to: '/' }]
]
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="platform"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <div
          class="flex items-center gap-1.5 py-1.5 text-sm"
          :class="collapsed ? 'px-1.5' : 'px-2.5'"
        >
          <UIcon
            name="i-lucide-shield"
            class="size-5 shrink-0"
          />
          <span
            v-if="!collapsed"
            class="font-semibold text-highlighted"
          >Platform</span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="items[0]"
          :collapsed="collapsed"
          orientation="vertical"
          tooltip
        />
        <UNavigationMenu
          :items="items[1]"
          :collapsed="collapsed"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
