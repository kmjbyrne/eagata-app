import type { ResolveSlugResponse } from '../../shared/contracts/orgs'

// An org renamed its slug: send the old link to the same page under the new
// one. Runs on the server for the first page too, so it answers with a
// redirect. Anyone who can't reach the org just gets the 404 page.
export default defineNuxtRouteMiddleware(async (to) => {
  const org = to.params.org
  if (typeof org !== 'string' || !useMe().me.value) {
    return
  }
  const { orgs } = useOrgs()
  if (orgs.value.some(entry => entry.org.slug === org)) {
    return
  }
  const resolved = await useRequestFetch()<ResolveSlugResponse>(`/api/orgs/${encodeURIComponent(org)}/resolve`).catch(() => null)
  if (resolved && resolved.slug !== org) {
    return navigateTo(to.fullPath.replace(`/${org}`, `/${resolved.slug}`), { redirectCode: 301 })
  }
})
