import type { FeedbackRepository, FeedbackSummaryView, FeedbackView } from '@kmjbyrne/core/feedback'
import type { FeedbackResponse, FeedbackSummaryResponse } from '../../shared/contracts/feedback'
import { MysqlFeedbackRepository } from '../adapters/mysql/MysqlFeedbackRepository'
// Adds this layer's adapter and service to the shell's types, wherever the layer is used.
import type {} from '../../types'

let defaultRepository: FeedbackRepository | undefined

/** The provided repository, such as the sandbox's, else MariaDB from NUXT_DATABASE_URL. */
export function useFeedbackRepository(): FeedbackRepository {
  const provided = useAdapters().feedbackRepository
  if (provided) {
    return provided
  }
  defaultRepository ??= new MysqlFeedbackRepository(useDatabase())
  return defaultRepository
}

export const toFeedbackSummary = (item: FeedbackSummaryView): FeedbackSummaryResponse => ({
  id: item.id,
  kind: item.kind,
  subject: item.subject,
  status: item.status,
  replyCount: item.replyCount,
  pagePath: item.pagePath,
  author: item.author,
  place: item.place,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString()
})

export const toFeedback = (item: FeedbackView): FeedbackResponse => ({
  ...toFeedbackSummary({ ...item, replyCount: item.replies.length }),
  body: item.body,
  replies: item.replies.map(reply => ({
    id: reply.id,
    author: reply.author,
    fromPlatform: reply.fromPlatform,
    body: reply.body,
    createdAt: reply.createdAt.toISOString()
  }))
})
