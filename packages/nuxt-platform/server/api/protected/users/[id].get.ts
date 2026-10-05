import { parseUserId } from '@kmjbyrne/core'
import type { PlatformUserDetailResponse } from '../../../../shared/contracts/platform'

export default defineServiceHandler(async (event): Promise<PlatformUserDetailResponse> => {
  const { user, orgs } = await useServices(event).platformUsers.get(parseUserId(getRouterParam(event, 'id')!))
  return { user: toPlatformUser(user), orgs: orgs.map(entry => ({ org: toPlatformOrg(entry.org), role: entry.role })) }
})
