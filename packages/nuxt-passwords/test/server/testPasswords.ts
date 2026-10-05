import { InMemoryPasswordRepository, PlainPasswordHasher } from '@kmjbyrne/core/passwords/testing'
import { RecordingEmailSender } from '@kmjbyrne/core/testing'

export const outbox = new RecordingEmailSender()

export default defineNitroPlugin(() => {
  provideAdapters({
    passwordRepository: new InMemoryPasswordRepository(),
    passwordHasher: new PlainPasswordHasher(),
    emailSender: outbox
  })
})
