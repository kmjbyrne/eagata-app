import { z } from 'zod'

export const feedbackKind = z.enum(['bug', 'idea', 'question', 'other'])
export const feedbackStatus = z.enum(['new', 'seen', 'done'])

// Lengths and content are checked by core. These caps only keep huge inputs out.
const html = z.string().max(2_000_000)

export const submitFeedbackBody = z.object({
  kind: z.string().max(32),
  subject: z.string().max(1024),
  body: html,
  pagePath: z.string().max(4096).nullish(),
  /** The workspace the author is in, for context. */
  from: z.object({ org: z.string().max(64), workspace: z.string().max(64) }).nullish()
})

export const feedbackReplyBody = z.object({ body: html })

export const feedbackStatusBody = z.object({ status: z.string().max(32) })

const person = z.object({ id: z.string(), displayName: z.string() })

export const feedbackSummaryResponse = z.object({
  id: z.string(),
  kind: feedbackKind,
  subject: z.string(),
  status: feedbackStatus,
  replyCount: z.number(),
  pagePath: z.string().nullable(),
  author: person,
  /** The workspace it was sent from, if any, for the inbox to show. */
  place: z.object({ workspaceId: z.string(), workspaceName: z.string(), workspaceSlug: z.string(), orgName: z.string(), orgSlug: z.string() }).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
})

export const feedbackResponse = feedbackSummaryResponse.extend({
  /** Sanitised HTML. */
  body: z.string(),
  replies: z.array(z.object({ id: z.string(), author: person, fromPlatform: z.boolean(), body: z.string(), createdAt: z.iso.datetime() }))
})

export type FeedbackKindValue = z.infer<typeof feedbackKind>
export type FeedbackStatusValue = z.infer<typeof feedbackStatus>
export type FeedbackSummaryResponse = z.infer<typeof feedbackSummaryResponse>
export type FeedbackResponse = z.infer<typeof feedbackResponse>
