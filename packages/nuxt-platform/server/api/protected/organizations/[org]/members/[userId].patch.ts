import { parseUserId } from '@kmjbyrne/core'
import { changeOrgRoleBody } from '../../../../../../shared/contracts/platform'

export default defineServiceHandler(async (event) => {
  const { role } = await readValidatedBody(event, changeOrgRoleBody.parse)
  await useServices(event).platformOrgs.changeRole(getRouterParam(event, 'org')!, parseUserId(getRouterParam(event, 'userId')!), role)
  setResponseStatus(event, 204)
  return null
})
