import type { PlatformOrgSummaryResponse } from '../../../../shared/contracts/platform'

/** Every org, personal ones included, with member and workspace counts. */
export default defineServiceHandler(async (event): Promise<PlatformOrgSummaryResponse[]> =>
  (await useServices(event).platformOrgs.list()).map(row => ({ org: toPlatformOrg(row.org), memberCount: row.memberCount, workspaceCount: row.workspaceCount }))
)
