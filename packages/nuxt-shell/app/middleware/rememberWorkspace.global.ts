// Remembers the workspace being viewed, for where `/` goes next time. It
// never decides what a request acts on: the URL does.
export default defineNuxtRouteMiddleware((to) => {
  const { org, workspace } = to.params
  if (import.meta.client && typeof org === 'string' && typeof workspace === 'string') {
    $fetch('/api/me/last-workspace', { method: 'PUT', body: { org, workspace } }).catch(() => undefined)
  }
})
