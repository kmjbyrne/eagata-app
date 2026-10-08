import { passwordSignInBody } from '../../../../shared/contracts/passwords'

export default defineServiceHandler(async (event) => {
  const { email, password } = await readValidatedBody(event, passwordSignInBody.parse)
  await limitByAddress(event, 'sign-in', ADDRESS_SIGN_IN_ATTEMPTS)
  const user = await useServices(event).passwords.signIn(email, password)
  await startSession(event, user)
  setResponseStatus(event, 204)
  return null
})
