import type { PlatformUserSummary } from '../../../../shared/contracts/platform'

export default defineServiceHandler(async (event): Promise<PlatformUserSummary[]> =>
  (await useServices(event).platformUsers.list()).map(toPlatformUser)
)
