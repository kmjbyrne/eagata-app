import type { UserId, WorkspaceId } from '../values/Ids'
import type { Feedback, FeedbackId, FeedbackReply, FeedbackStatus } from './Feedback'

/** Feedback as lists show it: no body or replies, but how many replies there are. */
export type FeedbackSummary = Omit<Feedback, 'body' | 'replies'> & { replyCount: number }

export interface FeedbackRepository {
  /** Latest activity first. Without a filter, every workspace's feedback. */
  list(filter?: { workspaceId: WorkspaceId, authorId: UserId }): Promise<FeedbackSummary[]>
  get(id: FeedbackId): Promise<Feedback | null>
  create(feedback: Omit<Feedback, 'replies'>): Promise<void>
  /** Also moves updatedAt, and sets the status when given, in the same write. */
  addReply(feedbackId: FeedbackId, reply: FeedbackReply, status?: FeedbackStatus): Promise<void>
  setStatus(id: FeedbackId, status: FeedbackStatus, at: Date): Promise<void>
}

/** Cuts HTML a user wrote down to what the editor makes, so others can safely render it. */
export interface HtmlSanitizer {
  sanitize(html: string): string
}
