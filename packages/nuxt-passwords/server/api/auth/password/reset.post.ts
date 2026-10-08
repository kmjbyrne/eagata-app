import { resetPasswordBody } from '../../../../shared/contracts/passwords'

/** Sets the password from an emailed link, and signs in. */
export default defineServiceHandler(async (event) => {
  const { token, password } = await readValidatedBody(event, resetPasswordBody.parse)
  const user = await useServices(event).passwords.resetPassword(token, password)
  await startSession(event, user)
  setResponseStatus(event, 204)
  return null
})
