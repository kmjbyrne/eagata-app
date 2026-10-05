import { passwordRepositoryContract } from '@kmjbyrne/core/passwords/contract'
import { MemoryJsonStore } from '@kmjbyrne/json-store'
import { describe, expect, it } from 'vitest'
import { defaultTenancyFixtures } from './fixtures'
import { defaultPasswordFixtures, JsonPasswordRepository, passwordCollections } from './passwords'

describe('JsonPasswordRepository', () => {
  passwordRepositoryContract(() => new JsonPasswordRepository(new MemoryJsonStore(passwordCollections([]))))

  it('gives passwords only to fixture users that exist', () => {
    const users = new Set(defaultTenancyFixtures().users.map(user => user.id))

    expect(defaultPasswordFixtures().every(credential => users.has(credential.id))).toBe(true)
  })
})
