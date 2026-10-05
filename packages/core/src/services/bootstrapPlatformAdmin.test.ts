import { describe, expect, it } from 'vitest'
import type { ProviderIdentity } from '../entities/User'
import { createTestServices } from '../testing/createTestServices'
import { bootstrapPlatformAdmin } from './bootstrapPlatformAdmin'

/** Signs in and returns the user, failing the test if linking needed proof. */
async function signIn(t: ReturnType<typeof createTestServices>, identity: ProviderIdentity) {
  const result = await t.services.auth.signIn(identity)
  if (result.kind !== 'signed-in') {
    throw new Error('Expected a sign-in, got a link that needs proof')
  }
  return result.user
}

describe('bootstrapPlatformAdmin', () => {
  it('creates the first platform admin, with a personal org, who can then sign in', async () => {
    const t = createTestServices()
    const { user, created } = await bootstrapPlatformAdmin(t.repositories, t.ids, { email: 'You@Example.com', displayName: 'You' })

    expect(created).toBe(true)
    expect(user).toMatchObject({ email: 'you@example.com', platformRole: { role: 'admin', grantedBy: null } })
    expect(await t.repositories.orgs.list()).toHaveLength(1)
    const signedIn = await signIn(t, { provider: 'google', subject: 'g-you', email: user.email, emailVerified: true, name: null, picture: null })
    expect(signedIn.id).toBe(user.id)
  })

  it('promotes, and reactivates, someone who exists', async () => {
    const t = createTestServices()
    const ada = await t.addUser('Ada Lovelace')
    await t.repositories.users.update({ ...ada, deactivatedAt: new Date() })
    const { user, created } = await bootstrapPlatformAdmin(t.repositories, t.ids, { email: ada.email })

    expect(created).toBe(false)
    expect(user).toMatchObject({ id: ada.id, platformRole: { role: 'admin', grantedBy: null }, deactivatedAt: null })
    expect((await t.repositories.users.findById(ada.id))?.platformRole?.role).toBe('admin')
  })
})
