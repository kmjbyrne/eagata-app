import { linkAccountBody } from '../../../shared/contracts/passwords'

/** Links the waiting provider account once the password confirms it, and signs in. */
export default defineServiceHandler(async (event) => {
  const { password } = await readValidatedBody(event, linkAccountBody.parse)
  const { pendingLink } = await readFlow(event)
  if (!pendingLink) {
    throw createError({ statusCode: 400, message: 'No sign-in is waiting to be linked. Start again.' })
  }
  await limitByAddress(event, 'sign-in', ADDRESS_SIGN_IN_ATTEMPTS)
  const user = await useServices(event).passwords.linkIdentity(pendingLink, password)
  await endFlow(event)
  await startSession(event, user.id)
  setResponseStatus(event, 204)
  return null
})
