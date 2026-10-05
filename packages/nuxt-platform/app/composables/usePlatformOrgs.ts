import type { PlatformOrgSummaryResponse } from '../../shared/contracts/platform'

/** Every org, with member and workspace counts. */
export function usePlatformOrgs() {
  const { data: orgs, refresh, status } = useFetch<PlatformOrgSummaryResponse[]>('/api/protected/organizations', { key: 'platform:orgs', default: () => [] })
  return { orgs, refresh, status }
}
