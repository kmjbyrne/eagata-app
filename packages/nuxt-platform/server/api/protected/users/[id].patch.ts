import { parseUserId } from '@kmjbyrne/core'
import { updateUserBody, type PlatformUserSummary } from '../../../../shared/contracts/platform'

/** Grants or revokes the platform role, or deactivates or reactivates: one per request. */
export default defineServiceHandler(async (event): Promise<PlatformUserSummary> => {
  const body = await readValidatedBody(event, updateUserBody.parse)
  const id = parseUserId(getRouterParam(event, 'id')!)
  const { platformUsers } = useServices(event)
  const user = 'isPlatformAdmin' in body
    ? await platformUsers.setPlatformAdmin(id, body.isPlatformAdmin)
    : await platformUsers.setDeactivated(id, body.deactivated)
  return toPlatformUser(user)
})
