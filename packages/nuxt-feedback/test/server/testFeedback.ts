import { InMemoryFeedbackRepository } from '@kmjbyrne/core/feedback/testing'
import { InMemoryMediaStorage } from '@kmjbyrne/core/media/testing'

export default defineNitroPlugin(() => {
  provideAdapters({ feedbackRepository: new InMemoryFeedbackRepository(), mediaStorage: new InMemoryMediaStorage() })
})
