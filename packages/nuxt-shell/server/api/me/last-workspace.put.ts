import { lastWorkspaceBody } from '../../../shared/contracts/me'

/** Remembers the workspace being viewed, after checking the user can act in it. Never decides what a request acts on. */
export default defineServiceHandler(async (event) => {
  const { org, workspace } = await readValidatedBody(event, lastWorkspaceBody.parse)
  const grant = await useServices(event).workspaceAccess.require(org, workspace)
  await rememberWorkspace(event, grant.org.slug, grant.workspace.slug)
  setResponseStatus(event, 204)
  return null
})
