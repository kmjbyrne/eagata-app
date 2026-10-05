import { InMemoryRepositories, SequentialIdGenerator } from '@kmjbyrne/core/testing'
import { FakeSignInProvider } from './FakeSignInProvider'

export default defineNitroPlugin(() => {
  provideAdapters({
    repositories: new InMemoryRepositories(),
    ids: new SequentialIdGenerator(),
    signIn: new FakeSignInProvider()
  })
})
