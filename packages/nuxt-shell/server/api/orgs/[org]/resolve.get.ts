import type { ResolveSlugResponse } from '../../../../shared/contracts/orgs'

/** The current slug for an org's old one, so old links can redirect. 404 for anyone who can't reach the org. */
export default defineServiceHandler(async (event): Promise<ResolveSlugResponse> =>
  ({ slug: await useServices(event).orgs.resolveSlug(getRouterParam(event, 'org')!) })
)
