import { feedbackRepositoryContract } from '@kmjbyrne/core/feedback/contract'
import { MemoryJsonStore } from '@kmjbyrne/json-store'
import { describe } from 'vitest'
import { feedbackCollections, JsonFeedbackRepository } from './feedback'

describe('JsonFeedbackRepository', () => {
  feedbackRepositoryContract(() => new JsonFeedbackRepository(new MemoryJsonStore(feedbackCollections())))
})
