import type { MeResponse } from '../../../shared/contracts/me'

export default defineServiceHandler(async (event): Promise<MeResponse> => {
  const user = await useServices(event).users.getMe()
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    isPlatformAdmin: user.isPlatformAdmin,
    identities: user.identities.map(identity => ({ provider: identity.provider })),
    providerLinked: user.identities.some(identity => identity.provider === useRuntimeConfig().public.signInProvider)
  }
})
