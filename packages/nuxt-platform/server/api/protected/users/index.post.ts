import { createUserBody, type PlatformUserSummary } from '../../../../shared/contracts/platform'

/** A user who can sign in with this email, with their personal org. */
export default defineServiceHandler(async (event): Promise<PlatformUserSummary> => {
  const { displayName, email } = await readValidatedBody(event, createUserBody.parse)
  const user = await useServices(event).platformUsers.create(displayName, email)
  setResponseStatus(event, 201)
  return toPlatformUser(user)
})
