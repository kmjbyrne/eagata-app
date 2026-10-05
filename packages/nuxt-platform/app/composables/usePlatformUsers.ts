import type { PlatformUserSummary } from '../../shared/contracts/platform'

/** Every user, for the platform's lists and pickers. */
export function usePlatformUsers() {
  const { data: users, refresh, status } = useFetch<PlatformUserSummary[]>('/api/protected/users', { key: 'platform:users', default: () => [] })
  return { users, refresh, status }
}
