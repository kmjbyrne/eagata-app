import { describe, expect, it } from 'vitest'
import { createTestServices } from '../testing/createTestServices'
import { bootstrapPlatformAdmin } from './bootstrapPlatformAdmin'

describe('bootstrapPlatformAdmin', () => {
  it('creates the first platform admin, with a personal org, who can then sign in', async () => {
    const t = createTestServices()
    const { user, created } = await bootstrapPlatformAdmin(t.repositories, t.ids, { email: 'You@Example.com', displayName: 'You' })

    expect(created).toBe(true)
    expect(user).toMatchObject({ email: 'you@example.com', isPlatformAdmin: true })
    expect(await t.repositories.orgs.list()).toHaveLength(1)
    const signedIn = await t.services.auth.signIn({ provider: 'google', subject: 'g-you', email: user.email, emailVerified: true, name: null, picture: null })
    expect(signedIn.id).toBe(user.id)
  })

  it('promotes, and reactivates, someone who exists', async () => {
    const t = createTestServices()
    const ada = await t.addUser('Ada Lovelace')
    await t.repositories.users.update({ ...ada, deactivatedAt: new Date() })
    const { user, created } = await bootstrapPlatformAdmin(t.repositories, t.ids, { email: ada.email })

    expect(created).toBe(false)
    expect(user).toMatchObject({ id: ada.id, isPlatformAdmin: true, deactivatedAt: null })
  })
})
