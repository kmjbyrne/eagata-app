import { parseUserId } from '@kmjbyrne/core'
import { addOrgMemberBody } from '../../../../../../shared/contracts/platform'

export default defineServiceHandler(async (event) => {
  const { userId, role } = await readValidatedBody(event, addOrgMemberBody.parse)
  await useServices(event).platformOrgs.addMember(getRouterParam(event, 'org')!, parseUserId(userId), role)
  setResponseStatus(event, 204)
  return null
})
