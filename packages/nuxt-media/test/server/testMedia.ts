import { InMemoryMediaStorage } from '@kmjbyrne/core/media/testing'

export default defineNitroPlugin(() => {
  provideAdapters({ mediaStorage: new InMemoryMediaStorage() })
})
