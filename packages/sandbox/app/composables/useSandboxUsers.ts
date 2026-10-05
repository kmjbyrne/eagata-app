import type { DevUser } from '../../server/utils/sandbox'

/** The people "Sign in as" offers, and a way to become one through the real sign-in flow. */
export function useSandboxUsers() {
  const { data: users, refresh } = useFetch<DevUser[]>('/api/_sandbox/users', { key: 'sandbox-users', default: () => [] })

  /** Signs out, then in again as `email`. The stand-in signs a hinted dev user straight in. */
  async function signInAs(email: string) {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    await navigateTo(`/api/auth/login?hint=${encodeURIComponent(email)}`, { external: true })
  }

  return { users, refresh, signInAs }
}
