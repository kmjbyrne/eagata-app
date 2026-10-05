import { parseUserId } from '@kmjbyrne/core'
import { createOrgBody, type PlatformOrg } from '../../../../shared/contracts/platform'

/** A company org, with its owner and a General workspace. */
export default defineServiceHandler(async (event): Promise<PlatformOrg> => {
  const { name, ownerUserId, slug } = await readValidatedBody(event, createOrgBody.parse)
  const org = await useServices(event).platformOrgs.create(name, parseUserId(ownerUserId), slug)
  setResponseStatus(event, 201)
  return toPlatformOrg(org)
})
