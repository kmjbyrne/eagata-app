import type { AccessibleWorkspaceResponse } from '../../../../../shared/contracts/orgs'

export default defineServiceHandler(async (event): Promise<AccessibleWorkspaceResponse[]> =>
  (await useServices(event).workspaces.list(getRouterParam(event, 'org')!)).map(toAccessibleWorkspace)
)
