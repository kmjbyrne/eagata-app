import { setPasswordBody } from '../../../shared/contracts/passwords'

/**
 * Sets the signed-in user's password, confirming the current one if they have
 * one. That signs the user out everywhere, so this browser gets a new session.
 */
export default defineServiceHandler(async (event) => {
  const body = await readValidatedBody(event, setPasswordBody.parse)
  await startSession(event, await useServices(event).passwords.setPassword(body))
  setResponseStatus(event, 204)
  return null
})
