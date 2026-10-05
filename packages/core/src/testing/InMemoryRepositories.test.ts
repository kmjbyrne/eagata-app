import { describe } from 'vitest'
import { InMemoryRepositories } from './InMemoryRepositories'
import { repositoryContract } from './repositoryContract'

describe('InMemoryRepositories', () => {
  repositoryContract(() => new InMemoryRepositories())
})
