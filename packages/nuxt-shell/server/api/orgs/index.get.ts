import type { AccessibleOrgResponse } from '../../../shared/contracts/orgs'

/** Every org the user can reach: their personal org first, then the rest by name. */
export default defineServiceHandler(async (event): Promise<AccessibleOrgResponse[]> =>
  (await useServices(event).orgs.listMine()).map(toAccessibleOrg)
)
