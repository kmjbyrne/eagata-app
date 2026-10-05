import { deactivateMeBody } from '../../../shared/contracts/me'

/** Deactivates the signed-in user's own account, and signs them out. */
export default defineServiceHandler(async (event) => {
  const { email } = await readValidatedBody(event, deactivateMeBody.parse)
  await useServices(event).users.deactivateMe(email)
  await endSession(event)
  setResponseStatus(event, 204)
  return null
})
