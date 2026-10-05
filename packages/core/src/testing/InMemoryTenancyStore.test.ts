import { describe } from 'vitest'
import { InMemoryTenancyStore } from './InMemoryTenancyStore'
import { repositoryContract } from './repositoryContract'

describe('InMemoryTenancyStore', () => {
  repositoryContract(() => new InMemoryTenancyStore())
})
