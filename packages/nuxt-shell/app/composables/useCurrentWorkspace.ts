import type { HomeResponse } from '../../shared/contracts/me'

interface WorkspaceSlugs {
  org: string
  workspace: string
}

/**
 * The org and workspace the URL names, as the user can see them. Off a
 * workspace page, such as Settings, the last one visited, so the sidebar keeps
 * its navigation. Undefined until there is one.
 */
export function useCurrentWorkspace() {
  const route = useRoute()
  const { orgs } = useOrgs()
  const last = useState<WorkspaceSlugs | null>('shell:last-workspace', () => null)
  const loading = useState('shell:last-workspace-loading', () => false)

  const fromRoute = computed<WorkspaceSlugs | null>(() =>
    typeof route.params.org === 'string' && typeof route.params.workspace === 'string'
      ? { org: route.params.org, workspace: route.params.workspace }
      : null)

  watch(fromRoute, (slugs) => {
    if (slugs) {
      last.value = slugs
    }
  }, { immediate: true })

  // Opened straight on a page outside a workspace: ask where `/` would go.
  if (import.meta.client && !last.value && !loading.value) {
    loading.value = true
    $fetch<HomeResponse>('/api/me/home')
      .then(({ path }) => {
        const [, org, workspace] = path.split('/')
        if (org && workspace && !last.value) {
          last.value = { org, workspace }
        }
      })
      .catch(() => {})
  }

  const slugs = computed(() => fromRoute.value ?? last.value)
  const org = computed(() => orgs.value.find(entry => entry.org.slug === slugs.value?.org))
  const workspace = computed(() => org.value?.workspaces.find(entry => entry.slug === slugs.value?.workspace))
  return { org, workspace }
}
