import type { DevUser } from '../../server/utils/sandbox'

/** The people "Sign in as" offers, and a way to become one at once. */
export function useSandboxUsers() {
  const { data: users, refresh } = useFetch<DevUser[]>('/api/_sandbox/users', { key: 'sandbox-users', default: () => [] })

  /**
   * Becomes `email` at once, skipping the provider, so it never asks to link
   * an account. A full page load, so nothing of the last user stays.
   */
  async function signInAs(email: string) {
    try {
      await $fetch('/api/_sandbox/sign-in-as', { method: 'POST', body: { email } })
      await navigateTo('/', { external: true })
    } catch {
      await navigateTo('/login?error=deactivated', { external: true })
    }
  }

  return { users, refresh, signInAs }
}
