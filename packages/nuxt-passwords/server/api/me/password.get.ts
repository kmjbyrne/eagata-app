import type { PasswordStatusResponse } from '../../../shared/contracts/passwords'

export default defineServiceHandler(async (event): Promise<PasswordStatusResponse> =>
  ({ hasPassword: await useServices(event).passwords.hasPassword() }))
