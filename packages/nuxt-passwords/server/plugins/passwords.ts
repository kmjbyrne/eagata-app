import { PasswordService } from '@kmjbyrne/core/passwords'
import { WerkzeugPasswordHasher } from '../adapters/WerkzeugPasswordHasher'

export default defineNitroPlugin(() => {
  const hasher = new WerkzeugPasswordHasher()

  registerServices(({ adapters, currentUser }) => ({
    passwords: new PasswordService({
      repositories: adapters.repositories,
      passwords: usePasswordRepository(),
      hasher: adapters.passwordHasher ?? hasher,
      mail: adapters.emailSender,
      limiter: adapters.rateLimiter,
      currentUser
    })
  }))

  // Google sign-in asks users with a password to confirm it before linking.
  provideAdapters({
    linkProof: { requiredFor: async userId => (await usePasswordRepository().findHash(userId)) !== null }
  })
})
