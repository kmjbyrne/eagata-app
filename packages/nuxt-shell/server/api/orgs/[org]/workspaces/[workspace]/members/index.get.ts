import type { MembersResponse } from '../../../../../../../shared/contracts/workspaces'

export default defineServiceHandler(async (event): Promise<MembersResponse> => {
  const { members, invitations } = await useServices(event).workspaces.listMembers(getRouterParam(event, 'org')!, getRouterParam(event, 'workspace')!)
  return { members: members.map(toWorkspaceMember), invitations: invitations.map(toInvitation) }
})
