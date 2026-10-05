import type { UserId, WorkspaceId } from '@kmjbyrne/core'
import type { Feedback, FeedbackId, FeedbackKind, FeedbackReply, FeedbackRepository, FeedbackStatus, FeedbackSummary } from '@kmjbyrne/core/feedback'
import { defineCollections, type DocumentsOf, type JsonStore } from '@kmjbyrne/json-store'
import { z } from 'zod'

// Dev data for @kmjbyrne/nuxt-feedback, for apps that extend it. Starts empty.

const replyRecord = z.object({
  id: z.string(),
  authorId: z.string(),
  fromPlatform: z.boolean(),
  body: z.string(),
  createdAt: z.iso.datetime()
})

export const feedbackRecord = z.object({
  id: z.string(),
  authorId: z.string(),
  workspaceId: z.string().nullable(),
  kind: z.enum(['bug', 'idea', 'question', 'other']),
  subject: z.string(),
  body: z.string(),
  pagePath: z.string().nullable(),
  status: z.enum(['new', 'seen', 'done']),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  replies: z.array(replyRecord)
})

type FeedbackRecord = z.infer<typeof feedbackRecord>

export function feedbackCollections() {
  return defineCollections({ feedback: { schema: feedbackRecord, seed: () => [] } })
}

export type FeedbackDocuments = DocumentsOf<ReturnType<typeof feedbackCollections>>

const toReply = (reply: FeedbackRecord['replies'][number]): FeedbackReply =>
  ({ ...reply, authorId: reply.authorId as UserId, createdAt: new Date(reply.createdAt) })

const toFeedback = (record: FeedbackRecord): Feedback => ({
  ...record,
  id: record.id as FeedbackId,
  workspaceId: record.workspaceId as WorkspaceId | null,
  authorId: record.authorId as UserId,
  kind: record.kind as FeedbackKind,
  status: record.status as FeedbackStatus,
  createdAt: new Date(record.createdAt),
  updatedAt: new Date(record.updatedAt),
  replies: record.replies.map(toReply)
})

export class JsonFeedbackRepository implements FeedbackRepository {
  constructor(private readonly store: JsonStore<FeedbackDocuments>) {}

  async list(filter?: { authorId: UserId }): Promise<FeedbackSummary[]> {
    const records = await this.store.find('feedback', item => !filter || item.authorId === filter.authorId)
    return records
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((record) => {
        const { body: _body, replies, ...summary } = toFeedback(record)
        return { ...summary, replyCount: replies.length }
      })
  }

  async get(id: FeedbackId) {
    const record = await this.store.get('feedback', id)
    return record ? toFeedback(record) : null
  }

  async create(item: Omit<Feedback, 'replies'>) {
    await this.store.put('feedback', { ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString(), replies: [] })
  }

  addReply(feedbackId: FeedbackId, reply: FeedbackReply, status?: FeedbackStatus) {
    return this.store.transaction(async (tx) => {
      const record = (await tx.get('feedback', feedbackId))!
      const createdAt = reply.createdAt.toISOString()
      await tx.put('feedback', { ...record, status: status ?? record.status, updatedAt: createdAt, replies: [...record.replies, { ...reply, createdAt }] })
    })
  }

  setStatus(id: FeedbackId, status: FeedbackStatus, at: Date) {
    return this.store.transaction(async (tx) => {
      const record = (await tx.get('feedback', id))!
      await tx.put('feedback', { ...record, status, updatedAt: at.toISOString() })
    })
  }
}
