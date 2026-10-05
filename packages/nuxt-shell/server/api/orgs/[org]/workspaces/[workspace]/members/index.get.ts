import type { WorkspaceMemberResponse } from '../../../../../../../shared/contracts/workspaces'

export default defineServiceHandler(async (event): Promise<WorkspaceMemberResponse[]> =>
  (await useServices(event).workspaces.listMembers(getRouterParam(event, 'org')!, getRouterParam(event, 'workspace')!)).map(toWorkspaceMember)
)
