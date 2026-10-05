import type { UserId, WorkspaceId } from '@kmjbyrne/core'
import type { Feedback, FeedbackId, FeedbackKind, FeedbackReply, FeedbackRepository, FeedbackStatus, FeedbackSummary } from '@kmjbyrne/core/feedback'
import type { Database } from '@kmjbyrne/nuxt-shell/mysql'
import { and, asc, count, desc, eq } from 'drizzle-orm'
import { feedback, feedbackReplies } from './schema'

type Row = typeof feedback.$inferSelect

const toItem = (row: Row): Omit<Feedback, 'replies'> => ({
  id: row.id as FeedbackId,
  workspaceId: row.workspaceId as WorkspaceId,
  authorId: row.authorId as UserId,
  kind: row.kind as FeedbackKind,
  subject: row.subject,
  body: row.body,
  pagePath: row.pagePath,
  status: row.status as FeedbackStatus,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
})

export class MysqlFeedbackRepository implements FeedbackRepository {
  constructor(private readonly db: Database) {}

  async list(filter?: { workspaceId: WorkspaceId, authorId: UserId }): Promise<FeedbackSummary[]> {
    const replyCount = count(feedbackReplies.id)
    const rows = await this.db.select({ item: feedback, replyCount }).from(feedback)
      .leftJoin(feedbackReplies, eq(feedbackReplies.feedbackId, feedback.id))
      .where(filter ? and(eq(feedback.workspaceId, filter.workspaceId), eq(feedback.authorId, filter.authorId)) : undefined)
      .groupBy(feedback.id)
      .orderBy(desc(feedback.updatedAt), desc(feedback.id))
    return rows.map(({ item, replyCount }) => {
      const { body: _body, ...summary } = toItem(item)
      return { ...summary, replyCount }
    })
  }

  async get(id: FeedbackId): Promise<Feedback | null> {
    const [row] = await this.db.select().from(feedback).where(eq(feedback.id, id))
    if (!row) {
      return null
    }
    const replies = await this.db.select().from(feedbackReplies).where(eq(feedbackReplies.feedbackId, id))
      .orderBy(asc(feedbackReplies.createdAt), asc(feedbackReplies.id))
    return {
      ...toItem(row),
      replies: replies.map(reply => ({ id: reply.id, authorId: reply.authorId as UserId, fromPlatform: reply.fromPlatform, body: reply.body, createdAt: reply.createdAt }))
    }
  }

  async create(item: Omit<Feedback, 'replies'>) {
    await this.db.insert(feedback).values(item)
  }

  async addReply(feedbackId: FeedbackId, reply: FeedbackReply, status?: FeedbackStatus) {
    await this.db.transaction(async (tx) => {
      await tx.insert(feedbackReplies).values({ ...reply, feedbackId })
      await tx.update(feedback).set({ updatedAt: reply.createdAt, ...(status ? { status } : {}) }).where(eq(feedback.id, feedbackId))
    })
  }

  async setStatus(id: FeedbackId, status: FeedbackStatus, at: Date) {
    await this.db.update(feedback).set({ status, updatedAt: at }).where(eq(feedback.id, id))
  }
}
