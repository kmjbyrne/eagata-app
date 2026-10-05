import type { AccessibleOrgResponse } from '../../../../shared/contracts/orgs'

export default defineServiceHandler(async (event): Promise<AccessibleOrgResponse> =>
  toAccessibleOrg(await useServices(event).orgs.getBySlug(getRouterParam(event, 'org')!))
)
