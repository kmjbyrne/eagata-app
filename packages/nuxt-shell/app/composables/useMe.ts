import type { MeResponse } from '../../shared/contracts/me'

/** The signed-in user, or null. Shared by every component, and fetched with the browser's cookies during SSR too. */
export function useMe() {
  const fetch = useRequestFetch()
  const { data: me, refresh, status } = useAsyncData('shell:me', () => fetch<MeResponse>('/api/me').catch(() => null), { default: () => null })
  return { me, refresh, status }
}
