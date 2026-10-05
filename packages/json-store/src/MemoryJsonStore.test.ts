import { describe } from 'vitest'
import { jsonStoreContract } from './contract'
import { MemoryJsonStore } from './MemoryJsonStore'

describe('MemoryJsonStore', () => {
  jsonStoreContract((collections, contents) => new MemoryJsonStore(collections, contents))
})
