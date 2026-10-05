import { parseUserId } from '@kmjbyrne/core'
import { changeMemberRoleBody } from '../../../../../../../shared/contracts/workspaces'

export default defineServiceHandler(async (event) => {
  const { role } = await readValidatedBody(event, changeMemberRoleBody.parse)
  await useServices(event).workspaces.changeMemberRole(
    getRouterParam(event, 'org')!,
    getRouterParam(event, 'workspace')!,
    parseUserId(getRouterParam(event, 'userId')!),
    role
  )
  setResponseStatus(event, 204)
  return null
})
