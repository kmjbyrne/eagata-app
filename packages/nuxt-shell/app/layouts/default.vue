<script setup lang="ts">
const { active } = useNavSections()
const { prefs, resize, toggle } = useNavPrefs()

// Every section opens a panel: its own component, or the list of its items.
const panel = computed(() => prefs.value.panelOpen ? active.value : undefined)

// A page's UDashboardSidebarCollapse collapses the sidebar, which here means
// the panel: the same as the rail's own control, and kept in step with it.
const collapsed = computed({
  get: () => !prefs.value.panelOpen,
  set: (value) => {
    if (value === prefs.value.panelOpen) {
      toggle('panelOpen')
    }
  }
})

// Only a column needs that. On a phone the sidebar is a slideover of fixed
// width, and a new one would close and reopen it at every pin or toggle.
const phone = ref(false)
let query: MediaQueryList | undefined
const onChange = () => phone.value = query!.matches
onMounted(() => {
  query = window.matchMedia('(max-width: 767.98px)')
  onChange()
  query.addEventListener('change', onChange)
})
onBeforeUnmount(() => query?.removeEventListener('change', onChange))
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
      <!-- The rail and the panel each have their own width and drag handle,
           so the sidebar doesn't resize: it is as wide as they are. -->
      <UDashboardSidebar
        id="shell"
        :key="phone ? 'shell-phone' : 'shell'"
        v-model:collapsed="collapsed"
        collapsible
        :persistent="false"
        :ui="{
          root: ['min-h-0 w-auto min-w-0 md:flex', prefs.visible ? '' : 'md:hidden lg:hidden'],
          body: 'flex-row gap-0 overflow-hidden p-0 sm:p-0',
          content: 'md:hidden',
          overlay: 'md:hidden'
        }"
      >
        <ShellRail />
        <div
          v-if="panel"
          class="relative min-w-0 flex-1 md:w-(--shell-panel) md:flex-none"
          :style="{ '--shell-panel': `${prefs.panelWidth}rem` }"
        >
          <div class="h-full overflow-y-auto">
            <component
              :is="panel.panel"
              v-if="panel.panel"
            />
            <ShellSectionPanel
              v-else
              :section="panel"
            />
          </div>
          <ShellResizeHandle
            :width="prefs.panelWidth"
            :min="PANEL.min"
            :max="PANEL.max"
            label="Resize the panel"
            @resize="(width, done) => resize('panelWidth', width, done)"
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
