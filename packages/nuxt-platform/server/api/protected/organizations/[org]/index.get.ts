import type { PlatformOrgDetailResponse } from '../../../../../shared/contracts/platform'

export default defineServiceHandler(async (event): Promise<PlatformOrgDetailResponse> =>
  toPlatformOrgDetail(await useServices(event).platformOrgs.get(getRouterParam(event, 'org')!))
)
