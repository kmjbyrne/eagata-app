<script setup lang="ts">
const { shell: { brand } } = useAppConfig()
const { prefs, toggle } = useNavPrefs()
</script>

<template>
  <header class="flex h-(--ui-header-height) shrink-0 items-center gap-1.5 border-b border-default px-3">
    <!-- On a phone the navigation is a slideover the toggle opens. On a wide
         screen it is a column this hides, giving the page the full width. -->
    <UDashboardSidebarToggle />
    <UButton
      icon="i-lucide-menu"
      color="neutral"
      variant="ghost"
      class="hidden lg:inline-flex"
      :aria-label="prefs.visible ? 'Hide navigation' : 'Show navigation'"
      :aria-expanded="prefs.visible"
      @click="toggle('visible')"
    />

    <NuxtLink
      to="/"
      class="flex shrink-0 items-center gap-2 px-1.5"
    >
      <img
        v-if="brand.logo"
        :src="brand.logo"
        alt=""
        class="size-7 object-contain"
      >
      <span class="hidden font-semibold text-highlighted sm:inline">{{ brand.name }}</span>
    </NuxtLink>

    <div class="flex min-w-0 flex-1 items-center justify-end gap-1">
      <OrgSwitcher />
      <WorkspaceSwitcher />
      <UColorModeButton />
      <UserMenu
        collapsed
        align="end"
      />
    </div>
  </header>
</template>
