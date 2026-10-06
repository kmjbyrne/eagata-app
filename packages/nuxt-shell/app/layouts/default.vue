<script setup lang="ts">
const { active } = useNavSections()
const { prefs } = useNavPrefs()

// Every section opens a panel: its own component, or the list of its items.
const panel = computed(() => prefs.value.panelOpen ? active.value : undefined)

// The rail is w-14, or w-44 pinned. The panel starts 11rem wide beside it.
const railRem = computed(() => prefs.value.pinned ? 11 : 3.5)
const panelRem = computed(() => railRem.value + 11)

// The sidebar reads its sizes and storage once, so each shape is its own
// sidebar. Only the panel resizes, and each panel shape keeps its own width.
const shape = computed(() => `shell-${panel.value ? 'panel' : 'rail'}${prefs.value.pinned ? '-pinned' : ''}`)
</script>

<template>
  <UDashboardGroup
    unit="rem"
    class="flex-col"
  >
    <!-- A column: the full-width header over the navigation and the page. The
         header stays inside the group, where its sidebar toggle finds the sidebar. -->
    <ShellHeader />

    <div class="flex min-h-0 flex-1">
      <!-- Hidden, not removed, when the person hides it: the same sidebar is
           the slideover on a phone. Nuxt UI makes it a slideover below lg, and
           closes that on every navigation, so it switches at md instead and
           stays a column on tablets. -->
      <UDashboardSidebar
        :id="shape"
        :key="shape"
        :resizable="!!panel"
        :default-size="panel ? panelRem : railRem"
        :min-size="panel ? panelRem : railRem"
        :max-size="panel ? 30 : railRem"
        :ui="{
          root: ['min-h-0 min-w-0 md:flex', prefs.visible ? '' : 'md:hidden lg:hidden'],
          body: 'flex-row gap-0 overflow-hidden p-0 sm:p-0',
          handle: 'md:block',
          content: 'md:hidden',
          overlay: 'md:hidden'
        }"
      >
        <ShellRail />
        <div
          v-if="panel"
          class="min-w-0 flex-1 overflow-y-auto"
        >
          <component
            :is="panel.panel"
            v-if="panel.panel"
          />
          <ShellSectionPanel
            v-else
            :section="panel"
          />
        </div>
      </UDashboardSidebar>

      <!-- Pages bring their own panel and navbar. Under the header, a navbar's
           own sidebar toggle would be a second one. -->
      <UTheme
        :props="{ dashboardNavbar: { toggle: false } }"
        :ui="{ dashboardPanel: { root: 'min-h-0' } }"
      >
        <slot />
      </UTheme>
    </div>
  </UDashboardGroup>
</template>
