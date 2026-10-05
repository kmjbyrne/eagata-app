import { isPlatformAdmin } from '@kmjbyrne/core'
import type { MeResponse } from '../../../shared/contracts/me'

export default defineServiceHandler(async (event): Promise<MeResponse> => {
  const user = await useServices(event).users.getMe()
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    isPlatformAdmin: isPlatformAdmin(user),
    identities: user.identities.map(identity => ({ provider: identity.provider, linkedAt: identity.linkedAt.toISOString() })),
    providerLinked: user.identities.some(identity => identity.provider === useRuntimeConfig().public.signInProvider)
  }
})
