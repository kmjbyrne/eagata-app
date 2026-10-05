import { createWorkspaceBody, type WorkspaceResponse } from '../../../../../shared/contracts/workspaces'

export default defineServiceHandler(async (event): Promise<WorkspaceResponse> => {
  const { name, slug } = await readValidatedBody(event, createWorkspaceBody.parse)
  const workspace = await useServices(event).workspaces.create(getRouterParam(event, 'org')!, name, slug)
  setResponseStatus(event, 201)
  return toWorkspaceResponse(workspace)
})
