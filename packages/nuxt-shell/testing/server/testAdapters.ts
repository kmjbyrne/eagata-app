import { InMemoryRepositories, RecordingEmailSender, SequentialIdGenerator } from '@kmjbyrne/core/testing'
import { FakeSignInProvider } from './FakeSignInProvider'

export default defineNitroPlugin(() => {
  provideAdapters({
    repositories: new InMemoryRepositories(),
    ids: new SequentialIdGenerator(),
    emailSender: new RecordingEmailSender(),
    signIn: new FakeSignInProvider()
  })
})
