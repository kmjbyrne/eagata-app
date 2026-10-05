import type { AccessibleOrgResponse } from '../../shared/contracts/orgs'

/** Every org the user reaches, with their role and the workspaces they see. Shared by every component. */
export function useOrgs() {
  const fetch = useRequestFetch()
  const { data: orgs, refresh } = useAsyncData('shell:orgs', () => fetch<AccessibleOrgResponse[]>('/api/orgs').catch(() => []), { default: () => [] })
  return { orgs, refresh }
}
