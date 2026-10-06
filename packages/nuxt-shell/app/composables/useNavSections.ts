import type { ShellNavItem, ShellNavSection } from '../app.config'

export interface NavItem extends ShellNavItem {
  /** Undefined while no page is at the path, so it shows as a row, not a dead link. */
  to?: string
  active: boolean
}

export interface NavSection extends Omit<ShellNavSection, 'items'> {
  to: string
  items: NavItem[]
}

/**
 * The layers' navigation sections, linked into the current workspace, and the
 * one the route is in. None without a workspace.
 */
export function useNavSections() {
  const { shell } = useAppConfig()
  const route = useRoute()
  const router = useRouter()
  const { org, workspace } = useCurrentWorkspace()

  // Workspace pages by their path, such as `/:org()/:workspace()/members`.
  // Resolving each item instead would warn in dev about every missing page.
  const pages = new Set(router.getRoutes().map(record => record.path))
  const hasPage = (path: string) => pages.has(`/:org()/:workspace()${path ? `/${path}` : ''}`)

  // The home's path is a prefix of every other, so it matches only exactly.
  const isAt = (path: string, to: string) =>
    route.path === to || (path !== '' && route.path.startsWith(`${to}/`))

  const sections = computed<NavSection[]>(() => {
    if (!org.value || !workspace.value) {
      return []
    }
    const base = `/${org.value.org.slug}/${workspace.value.slug}`
    const link = (path: string) => path ? `${base}/${path}` : base
    return [...shell.navSections as ShellNavSection[]]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(section => ({
        ...section,
        to: link(section.path),
        items: (section.items ?? []).map((item) => {
          const to = link(item.path)
          return { ...item, to: hasPage(item.path) ? to : undefined, active: route.path === to }
        })
      }))
  })

  const active = computed(() => sections.value.find(section => isAt(section.path, section.to)))

  return { sections, active }
}
