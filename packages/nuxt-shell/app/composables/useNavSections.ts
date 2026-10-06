import type { ShellNavSection } from '../app.config'

export interface NavSection extends ShellNavSection {
  to: string
}

/**
 * The layers' navigation sections, linked into the current workspace, and the
 * one the route is in. None without a workspace.
 */
export function useNavSections() {
  const { shell } = useAppConfig()
  const route = useRoute()
  const { org, workspace } = useCurrentWorkspace()

  const sections = computed<NavSection[]>(() => {
    if (!org.value || !workspace.value) {
      return []
    }
    const base = `/${org.value.org.slug}/${workspace.value.slug}`
    return [...shell.navSections as ShellNavSection[]]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(section => ({ ...section, to: section.path ? `${base}/${section.path}` : base }))
  })

  // The home's path is a prefix of every other, so it matches only exactly.
  const active = computed(() => sections.value.find(section =>
    route.path === section.to || (section.path !== '' && route.path.startsWith(`${section.to}/`))))

  return { sections, active }
}
