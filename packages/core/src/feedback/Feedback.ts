import { InvalidInputError } from '../errors'
import type { UserId, WorkspaceId } from '../values/Ids'

export type FeedbackId = string & { readonly __brand: 'FeedbackId' }

export const FEEDBACK_KINDS = ['bug', 'idea', 'question', 'other'] as const

export type FeedbackKind = typeof FEEDBACK_KINDS[number]

/** New until the platform looks at it, seen while it's being handled, done once handled. */
export const FEEDBACK_STATUSES = ['new', 'seen', 'done'] as const

export type FeedbackStatus = typeof FEEDBACK_STATUSES[number]

export class InvalidFeedbackKindError extends InvalidInputError {
  constructor(readonly input: string) {
    super(`Feedback is one of ${FEEDBACK_KINDS.join(', ')}. Got "${input}"`)
  }
}

export class InvalidFeedbackStatusError extends InvalidInputError {
  constructor(readonly input: string) {
    super(`A feedback status is one of ${FEEDBACK_STATUSES.join(', ')}. Got "${input}"`)
  }
}

export function parseFeedbackKind(input: string): FeedbackKind {
  const candidate = input.trim().toLowerCase()
  if (!(FEEDBACK_KINDS as readonly string[]).includes(candidate)) {
    throw new InvalidFeedbackKindError(input)
  }
  return candidate as FeedbackKind
}

export function parseFeedbackStatus(input: string): FeedbackStatus {
  const candidate = input.trim().toLowerCase()
  if (!(FEEDBACK_STATUSES as readonly string[]).includes(candidate)) {
    throw new InvalidFeedbackStatusError(input)
  }
  return candidate as FeedbackStatus
}

export interface FeedbackReply {
  id: string
  authorId: UserId
  /** Written by a platform admin, not the member who raised it. */
  fromPlatform: boolean
  /** Sanitised HTML. */
  body: string
  createdAt: Date
}

/** Something a workspace member raised for the platform, with its replies. */
export interface Feedback {
  id: FeedbackId
  workspaceId: WorkspaceId
  authorId: UserId
  kind: FeedbackKind
  subject: string
  /** Sanitised HTML. */
  body: string
  /** The app path the member was on when they wrote it. */
  pagePath: string | null
  status: FeedbackStatus
  createdAt: Date
  /** Moves with every reply and status change. */
  updatedAt: Date
  /** Oldest first. */
  replies: FeedbackReply[]
}
