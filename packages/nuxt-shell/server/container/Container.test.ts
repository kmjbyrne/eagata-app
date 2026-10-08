import { describe, expect, it } from 'vitest'
import { InMemoryRepositories, SequentialIdGenerator, FakeCurrentUser } from '@kmjbyrne/core/testing'
import type { SignInProvider } from '@kmjbyrne/core'
import { Container, missingAdapter } from './Container'

const signIn = {} as SignInProvider

describe('Container', () => {
  it('builds the core services on the default adapters', async () => {
    const container = new Container(() => ({ repositories: new InMemoryRepositories(), ids: new SequentialIdGenerator(), signIn }))

    await expect(container.services(new FakeCurrentUser()).users.getMe()).rejects.toThrow('Sign in required')
  })

  it('prefers provided adapters to the defaults', () => {
    const provided = new InMemoryRepositories()
    const container = new Container(() => ({ repositories: new InMemoryRepositories() }))
    container.provideAdapters({ repositories: provided })

    expect(container.adapters().repositories).toBe(provided)
  })

  it('gives the defaults what was provided, so they can skip building it', () => {
    const provided = new InMemoryRepositories()
    const container = new Container((given) => {
      if (!given.repositories) {
        throw new Error('No repositories to default to')
      }
      return {}
    })
    container.provideAdapters({ repositories: provided })

    expect(container.adapters().repositories).toBe(provided)
  })

  it('builds the defaults once, and only when first used', () => {
    let built = 0
    const container = new Container(() => {
      built++
      return {}
    })
    expect(built).toBe(0)
    container.adapters()
    container.adapters()

    expect(built).toBe(1)
  })

  it('adds registered app services, built with the adapters and core services', () => {
    const container = new Container(() => ({ repositories: new InMemoryRepositories(), ids: new SequentialIdGenerator(), signIn }))
    container.registerServices(({ core, currentUser }) => ({ greeting: { core, currentUser } }) as never)
    const currentUser = new FakeCurrentUser()
    const services = container.services(currentUser) as unknown as { greeting: { currentUser: unknown, core: unknown } }

    expect(services.greeting.currentUser).toBe(currentUser)
    expect(services.greeting.core).toHaveProperty('workspaceAccess')
  })
})

describe('missingAdapter', () => {
  it('throws its message on first use, not before', () => {
    const repositories = missingAdapter<{ users: unknown }>('No data store is configured')

    expect(() => repositories.users).toThrow('No data store is configured')
  })
})
