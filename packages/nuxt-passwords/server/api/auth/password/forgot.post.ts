import { forgotPasswordBody } from '../../../../shared/contracts/passwords'

const RESET_REQUESTS_PER_ADDRESS = { limit: 10, windowMs: 60 * 60 * 1000 }

/** Always answers the same way, and before the work is done, so it reveals nothing about accounts. */
export default defineServiceHandler(async (event) => {
  await limitByAddress(event, 'password-reset', RESET_REQUESTS_PER_ADDRESS)
  const { email } = await readValidatedBody(event, forgotPasswordBody.parse)
  const work = useServices(event).passwords.requestReset(email, setPasswordUrl(event))
    .catch(error => console.error('[passwords] reset request failed', error))
  event.waitUntil(work)
  setResponseStatus(event, 202)
  return null
})
