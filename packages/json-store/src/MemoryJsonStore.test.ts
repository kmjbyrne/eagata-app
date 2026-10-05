import { describe } from 'vitest'
import { contractCollections, jsonStoreContract } from './contract'
import { MemoryJsonStore } from './MemoryJsonStore'

describe('MemoryJsonStore', () => {
  jsonStoreContract(() => new MemoryJsonStore(contractCollections))
})
