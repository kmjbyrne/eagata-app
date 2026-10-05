export function useSignOut() {
  async function signOut() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    clearNuxtData(key => key.startsWith('shell:'))
    await navigateTo('/login')
  }
  return { signOut }
}
