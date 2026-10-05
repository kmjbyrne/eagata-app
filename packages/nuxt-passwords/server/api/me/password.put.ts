import { setPasswordBody } from '../../../shared/contracts/passwords'

/** Sets the signed-in user's password, confirming the current one if they have one. */
export default defineServiceHandler(async (event) => {
  const body = await readValidatedBody(event, setPasswordBody.parse)
  await useServices(event).passwords.setPassword(body)
  setResponseStatus(event, 204)
  return null
})
