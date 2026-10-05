import { addMemberBody, type WorkspaceMemberResponse } from '../../../../../../../shared/contracts/workspaces'

/** Shares the workspace with someone who has an account, by their email. */
export default defineServiceHandler(async (event): Promise<WorkspaceMemberResponse> => {
  const { email, role } = await readValidatedBody(event, addMemberBody.parse)
  const member = await useServices(event).workspaces.addMember(getRouterParam(event, 'org')!, getRouterParam(event, 'workspace')!, email, role)
  setResponseStatus(event, 201)
  return toWorkspaceMember(member)
})
