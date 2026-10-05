import type { UserId, WorkspaceId } from '../values/Ids'
import type { Feedback, FeedbackId, FeedbackReply, FeedbackStatus } from './Feedback'
import type { FeedbackRepository, HtmlSanitizer } from './ports'

export class InMemoryFeedbackRepository implements FeedbackRepository {
  private readonly items: Feedback[] = []

  async list(filter?: { workspaceId: WorkspaceId, authorId: UserId }) {
    return this.items
      .filter(item => !filter || (item.workspaceId === filter.workspaceId && item.authorId === filter.authorId))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(({ body: _body, replies, ...summary }) => structuredClone({ ...summary, replyCount: replies.length }))
  }

  async get(id: FeedbackId) {
    const item = this.items.find(entry => entry.id === id)
    return item ? structuredClone(item) : null
  }

  async create(feedback: Omit<Feedback, 'replies'>) {
    this.items.push(structuredClone({ ...feedback, replies: [] }))
  }

  async addReply(feedbackId: FeedbackId, reply: FeedbackReply, status?: FeedbackStatus) {
    const item = this.items.find(entry => entry.id === feedbackId)!
    item.replies.push(structuredClone(reply))
    item.updatedAt = reply.createdAt
    item.status = status ?? item.status
  }

  async setStatus(id: FeedbackId, status: FeedbackStatus, at: Date) {
    const item = this.items.find(entry => entry.id === id)!
    item.status = status
    item.updatedAt = at
  }
}

/** Drops tags named script, and nothing else: enough to test that bodies are sanitised. */
export class StripScriptsSanitizer implements HtmlSanitizer {
  sanitize(html: string) {
    return html.replace(/<script[\s\S]*?<\/script>/gi, '')
  }
}
