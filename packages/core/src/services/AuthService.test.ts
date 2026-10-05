import { describe, expect, it } from 'vitest'
import type { ProviderIdentity } from '../entities/User'
import { AccountDeactivatedError, EmailNotVerifiedError, IdentityInUseError, IdentityMismatchError, NotInvitedError, NotSignedInError } from '../errors'
import { createTestServices } from '../testing/createTestServices'
import { parseEmail } from '../values/Email'

/** Signs in and returns the user, failing the test if linking needed proof. */
async function signIn(t: ReturnType<typeof createTestServices>, identity: ProviderIdentity) {
  const result = await t.services.auth.signIn(identity)
  if (result.kind !== 'signed-in') {
    throw new Error('Expected a sign-in, got a link that needs proof')
  }
  return result.user
}

function identity(overrides: Partial<ProviderIdentity> = {}): ProviderIdentity {
  return {
    provider: 'google',
    subject: 'g-ada',
    email: parseEmail('ada@example.com'),
    emailVerified: true,
    name: 'Ada Lovelace',
    picture: null,
    ...overrides
  }
}

describe('AuthService.signIn', () => {
  describe('closed registration', () => {
    it('refuses an email no platform admin set up, and creates nothing', async () => {
      const t = createTestServices()

      await expect(t.services.auth.signIn(identity())).rejects.toThrow(NotInvitedError)
      expect(await t.repositories.users.list()).toEqual([])
      expect(await t.repositories.orgs.list()).toEqual([])
    })

    it('refuses an unverified email that nobody set up as not invited', async () => {
      const t = createTestServices()

      await expect(t.services.auth.signIn(identity({ emailVerified: false }))).rejects.toThrow(NotInvitedError)
    })
  })

  describe('first sign-in', () => {
    it('links the identity to the user a platform admin set up, and refreshes the avatar', async () => {
      const t = createTestServices()
      const ada = await t.addUser('Ada Lovelace', { email: 'ada@example.com' })
      const signedIn = await signIn(t, identity({ picture: 'https://example.com/ada.png' }))

      expect(signedIn).toMatchObject({ id: ada.id, avatarUrl: 'https://example.com/ada.png', identities: [{ provider: 'google', subject: 'g-ada', linkedAt: expect.any(Date) }] })
      expect(await t.repositories.orgs.list()).toHaveLength(1)
    })

    it('keeps the name the platform admin gave', async () => {
      const t = createTestServices()
      await t.addUser('Ada Lovelace', { email: 'ada@example.com' })

      expect((await signIn(t, identity({ name: 'A. King' }))).displayName).toBe('Ada Lovelace')
    })

    it('never links an unverified email', async () => {
      const t = createTestServices()
      await t.addUser('Ada Lovelace', { email: 'ada@example.com' })

      await expect(t.services.auth.signIn(identity({ emailVerified: false }))).rejects.toThrow(EmailNotVerifiedError)
    })
  })

  describe('signing in again', () => {
    async function signedInAda() {
      const t = createTestServices()
      await t.addUser('Ada Lovelace', { email: 'ada@example.com' })
      const ada = await signIn(t, identity())
      return { t, ada }
    }

    it('signs the same user in by identity, refreshing the avatar', async () => {
      const { t, ada } = await signedInAda()
      const again = await signIn(t, identity({ picture: 'https://example.com/new.png' }))

      expect(again.id).toBe(ada.id)
      expect((await t.repositories.users.findById(ada.id))?.avatarUrl).toBe('https://example.com/new.png')
    })

    it('signs in by identity even after the email changed at the provider', async () => {
      const { t, ada } = await signedInAda()

      expect((await signIn(t, identity({ email: parseEmail('lovelace@example.com') }))).id).toBe(ada.id)
    })

    it('refuses a second account at the same provider for the same email', async () => {
      const { t } = await signedInAda()

      await expect(t.services.auth.signIn(identity({ subject: 'g-someone-else' }))).rejects.toThrow(IdentityMismatchError)
    })

    it('links an account at another provider to the same user', async () => {
      const { t, ada } = await signedInAda()
      const viaOther = await signIn(t, identity({ provider: 'microsoft', subject: 'm-ada' }))

      expect(viaOther.id).toBe(ada.id)
      expect(viaOther.identities).toHaveLength(2)
    })

    it('refuses a deactivated user, by identity or by email', async () => {
      const { t, ada } = await signedInAda()
      await t.repositories.users.update({ ...ada, deactivatedAt: new Date() })

      await expect(t.services.auth.signIn(identity())).rejects.toThrow(AccountDeactivatedError)
      await expect(t.services.auth.signIn(identity({ provider: 'microsoft', subject: 'm-ada' }))).rejects.toThrow(AccountDeactivatedError)
    })
  })

  describe('linking that needs proof', () => {
    it('links nothing yet, and says what to link once the user proves it is them', async () => {
      const t = createTestServices({ linkProof: { requiredFor: async () => true } })
      const ada = await t.addUser('Ada Lovelace', { email: 'ada@example.com' })
      const result = await t.services.auth.signIn(identity({ picture: 'https://example.com/a.png' }))

      expect(result).toEqual({
        kind: 'link-required',
        link: { userId: ada.id, identity: { provider: 'google', subject: 'g-ada' }, email: 'ada@example.com', picture: 'https://example.com/a.png' }
      })
      expect((await t.repositories.users.findById(ada.id))?.identities).toEqual([])
    })

    it('signs in an account linked before, without asking again', async () => {
      const t = createTestServices({ linkProof: { requiredFor: async () => true } })
      const ada = await t.addUser('Ada Lovelace', { email: 'ada@example.com' })
      await t.repositories.users.linkIdentity(ada.id, { provider: 'google', subject: 'g-ada', linkedAt: new Date() })

      expect((await t.services.auth.signIn(identity())).kind).toBe('signed-in')
    })
  })
})

describe('AuthService.connectIdentity', () => {
  it('links a provider account to the signed-in user', async () => {
    const t = createTestServices()
    const ada = await t.addUser('Ada Lovelace', { email: 'ada@example.com' })
    t.signInAs(ada)
    const user = await t.services.auth.connectIdentity(identity({ email: parseEmail('someone-else@gmail.com') }))

    expect(user.identities).toEqual([{ provider: 'google', subject: 'g-ada', linkedAt: expect.any(Date) }])
  })

  it('refuses an account another user has, and a second account at the same provider', async () => {
    const t = createTestServices()
    const ada = await t.addUser('Ada Lovelace', { email: 'ada@example.com' })
    const grace = await t.addUser('Grace Hopper', { email: 'grace@example.com' })
    t.signInAs(ada)
    await t.services.auth.connectIdentity(identity())
    t.signInAs(grace)

    await expect(t.services.auth.connectIdentity(identity())).rejects.toThrow(IdentityInUseError)
    await t.services.auth.connectIdentity(identity({ subject: 'g-grace' }))
    await expect(t.services.auth.connectIdentity(identity({ subject: 'g-grace-2' }))).rejects.toThrow(IdentityMismatchError)
  })

  it('needs a signed-in user', async () => {
    await expect(createTestServices().services.auth.connectIdentity(identity())).rejects.toThrow(NotSignedInError)
  })
})
