<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{ collapsed?: boolean }>()

const { me } = useMe()
const { signOut } = useSignOut()
const { shell } = useAppConfig()
const colorMode = useColorMode()
const route = useRoute()

const inside = (to: string) => route.path === to || route.path.startsWith(`${to}/`)

const appearances = [
  { label: 'Light', value: 'light', icon: 'i-lucide-sun' },
  { label: 'Dark', value: 'dark', icon: 'i-lucide-moon' },
  { label: 'System', value: 'system', icon: 'i-lucide-monitor' }
]

const items = computed<DropdownMenuItem[][]>(() => [
  [{ type: 'label', label: me.value?.displayName, description: me.value?.email, avatar: { src: me.value?.avatarUrl ?? undefined, alt: me.value?.displayName } }],
  [
    { label: 'Settings', icon: 'i-lucide-settings', to: '/settings' },
    {
      label: 'Appearance',
      icon: 'i-lucide-sun-moon',
      children: appearances.map(appearance => ({
        label: appearance.label,
        icon: appearance.icon,
        type: 'checkbox' as const,
        checked: colorMode.preference === appearance.value,
        onSelect: (event: Event) => {
          event.preventDefault()
          colorMode.preference = appearance.value
        }
      }))
    },
    ...shell.userMenuItems
      .filter(item => !item.platformAdminOnly || me.value?.isPlatformAdmin)
      .map(item => item.whileInside && inside(item.to) ? item.whileInside : item)
      .map(item => ({ label: item.label, icon: item.icon, to: item.to }))
  ],
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: signOut }]
])
</script>

<template>
  <UDropdownMenu
    v-if="me"
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-56' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :label="collapsed ? undefined : me.displayName"
      :avatar="{ src: me.avatarUrl ?? undefined, alt: me.displayName }"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
    />
    <template
      v-if="shell.userMenuExtras.length"
      #content-bottom
    >
      <div class="border-t border-default p-1">
        <component
          :is="name"
          v-for="name in shell.userMenuExtras"
          :key="name"
        />
      </div>
    </template>
  </UDropdownMenu>
</template>
