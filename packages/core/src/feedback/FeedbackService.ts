import { workspacePermissions } from '../entities/permissions'
import type { User } from '../entities/User'
import { InvalidInputError, NotFoundError } from '../errors'
import type { MediaService, StoredMedia } from '../media/MediaService'
import type { CurrentUser } from '../ports/CurrentUser'
import type { IdGenerator } from '../ports/IdGenerator'
import type { Repositories } from '../ports/Repositories'
import { requirePlatformAdmin } from '../services/platform'
import type { WorkspaceAccess } from '../services/WorkspaceAccess'
import type { UserId, WorkspaceId } from '../values/Ids'
import { parseFeedbackKind, parseFeedbackStatus, type Feedback, type FeedbackId, type FeedbackReply, type FeedbackStatus } from './Feedback'
import type { FeedbackRepository, FeedbackSummary, HtmlSanitizer } from './ports'

export const FEEDBACK_SUBJECT_MAX_LENGTH = 255
export const FEEDBACK_PAGE_PATH_MAX_LENGTH = 2048

/** Anyone in a workspace can raise feedback from it, viewers included. */
export const feedbackPermissions = workspacePermissions.extend({ 'feedback.submit': 'viewer' })

export class InvalidFeedbackSubjectError extends InvalidInputError {
  constructor(readonly input: string) {
    super(input.trim() ? `Subjects are at most ${FEEDBACK_SUBJECT_MAX_LENGTH} characters` : 'A subject is required')
  }
}

export class EmptyFeedbackBodyError extends InvalidInputError {
  constructor() {
    super('Write a message or add an image')
  }
}

export interface FeedbackInput {
  kind: string
  subject: string
  body: string
  pagePath?: string | null
}

export interface FeedbackPerson {
  id: UserId
  displayName: string
}

/** Where feedback came from, for the inbox to show and link. */
export interface FeedbackPlace {
  workspaceId: WorkspaceId
  workspaceName: string
  workspaceSlug: string
  orgName: string
  orgSlug: string
}

export type FeedbackSummaryView = FeedbackSummary & { author: FeedbackPerson, place: FeedbackPlace }

export type FeedbackView = Omit<Feedback, 'replies'> & {
  author: FeedbackPerson
  place: FeedbackPlace
  replies: (FeedbackReply & { author: FeedbackPerson })[]
}

export interface FeedbackAdapters {
  repositories: Repositories
  currentUser: CurrentUser
  access: WorkspaceAccess
  feedback: FeedbackRepository
  sanitizer: HtmlSanitizer
  media: MediaService
  ids: IdGenerator
  now?: () => Date
}

/**
 * Things members raise for the platform from a workspace. Members see and
 * answer only their own. Platform admins see every workspace's, answer them,
 * and set their status.
 */
export class FeedbackService {
  constructor(private readonly adapters: FeedbackAdapters) {}

  private now() {
    return this.adapters.now?.() ?? new Date()
  }

  async submit(orgSlug: string, workspaceSlug: string, input: FeedbackInput): Promise<FeedbackView> {
    const { workspace, userId } = await this.adapters.access.require(orgSlug, workspaceSlug, 'feedback.submit', feedbackPermissions)
    const subject = input.subject.trim()
    if (!subject || subject.length > FEEDBACK_SUBJECT_MAX_LENGTH) {
      throw new InvalidFeedbackSubjectError(input.subject)
    }
    const now = this.now()
    const id = this.adapters.ids.next() as FeedbackId
    await this.adapters.feedback.create({
      id,
      workspaceId: workspace.id,
      authorId: userId,
      kind: parseFeedbackKind(input.kind),
      subject,
      body: this.parseBody(input.body),
      pagePath: parsePagePath(input.pagePath),
      status: 'new',
      createdAt: now,
      updatedAt: now
    })
    return this.view(await this.require(id))
  }

  /** The signed-in member's own feedback in the workspace, latest activity first. */
  async listOwn(orgSlug: string, workspaceSlug: string): Promise<FeedbackSummaryView[]> {
    const { workspace, userId } = await this.adapters.access.require(orgSlug, workspaceSlug)
    return this.summaries(await this.adapters.feedback.list({ workspaceId: workspace.id, authorId: userId }))
  }

  /** Someone else's feedback is not found, never forbidden, so ids reveal nothing. */
  async getOwn(orgSlug: string, workspaceSlug: string, id: string): Promise<FeedbackView> {
    return this.view(await this.requireOwn(orgSlug, workspaceSlug, id))
  }

  /** A reply on done feedback reopens it, so the platform sees it again. */
  async replyAsAuthor(orgSlug: string, workspaceSlug: string, id: string, body: string): Promise<FeedbackView> {
    const feedback = await this.requireOwn(orgSlug, workspaceSlug, id)
    await this.reply(feedback, feedback.authorId, false, body, feedback.status === 'done' ? 'new' : undefined)
    return this.view(await this.require(feedback.id))
  }

  /** Every workspace's feedback, for platform admins. */
  async listAll(): Promise<FeedbackSummaryView[]> {
    await requirePlatformAdmin(this.adapters.repositories, this.adapters.currentUser)
    return this.summaries(await this.adapters.feedback.list())
  }

  async get(id: string): Promise<FeedbackView> {
    await requirePlatformAdmin(this.adapters.repositories, this.adapters.currentUser)
    return this.view(await this.require(id))
  }

  /** Answering new feedback marks it seen. */
  async replyAsPlatform(id: string, body: string): Promise<FeedbackView> {
    const admin = await requirePlatformAdmin(this.adapters.repositories, this.adapters.currentUser)
    const feedback = await this.require(id)
    await this.reply(feedback, admin.id, true, body, feedback.status === 'new' ? 'seen' : undefined)
    return this.view(await this.require(feedback.id))
  }

  async setStatus(id: string, statusInput: string): Promise<FeedbackView> {
    await requirePlatformAdmin(this.adapters.repositories, this.adapters.currentUser)
    const feedback = await this.require(id)
    await this.adapters.feedback.setStatus(feedback.id, parseFeedbackStatus(statusInput), this.now())
    return this.view(await this.require(feedback.id))
  }

  /**
   * Stores an image for a platform reply, in the feedback's workspace, where
   * the author can see it. Platform admins aren't members, so they can't
   * upload there directly.
   */
  async attachImage(id: string, bytes: Uint8Array): Promise<StoredMedia> {
    await requirePlatformAdmin(this.adapters.repositories, this.adapters.currentUser)
    const feedback = await this.require(id)
    return this.adapters.media.store(feedback.workspaceId, bytes)
  }

  private async reply(feedback: Feedback, authorId: UserId, fromPlatform: boolean, body: string, status?: FeedbackStatus) {
    const reply = { id: this.adapters.ids.next(), authorId, fromPlatform, body: this.parseBody(body), createdAt: this.now() }
    await this.adapters.feedback.addReply(feedback.id, reply, status)
  }

  private async require(id: string): Promise<Feedback> {
    const feedback = await this.adapters.feedback.get(id as FeedbackId)
    if (!feedback) {
      throw new NotFoundError('Feedback not found')
    }
    return feedback
  }

  private async requireOwn(orgSlug: string, workspaceSlug: string, id: string): Promise<Feedback> {
    const { workspace, userId } = await this.adapters.access.require(orgSlug, workspaceSlug)
    const feedback = await this.adapters.feedback.get(id as FeedbackId)
    if (!feedback || feedback.workspaceId !== workspace.id || feedback.authorId !== userId) {
      throw new NotFoundError('Feedback not found')
    }
    return feedback
  }

  /** Sanitises, and refuses a body with neither text nor an image left in it. */
  private parseBody(html: string): string {
    const body = this.adapters.sanitizer.sanitize(html)
    const text = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    if (!text && !/<img\s/i.test(body)) {
      throw new EmptyFeedbackBodyError()
    }
    return body
  }

  private async person(id: UserId, cache: Map<UserId, FeedbackPerson>): Promise<FeedbackPerson> {
    if (!cache.has(id)) {
      const user: User | null = await this.adapters.repositories.users.findById(id)
      cache.set(id, { id, displayName: user?.displayName ?? 'Unknown' })
    }
    return cache.get(id)!
  }

  private async place(workspaceId: WorkspaceId, cache: Map<WorkspaceId, FeedbackPlace>): Promise<FeedbackPlace> {
    if (!cache.has(workspaceId)) {
      const workspace = await this.adapters.repositories.workspaces.findById(workspaceId)
      const org = workspace ? await this.adapters.repositories.orgs.findById(workspace.orgId) : null
      cache.set(workspaceId, {
        workspaceId,
        workspaceName: workspace?.name ?? 'Unknown',
        workspaceSlug: workspace?.slug ?? '',
        orgName: org?.name ?? 'Unknown',
        orgSlug: org?.slug ?? ''
      })
    }
    return cache.get(workspaceId)!
  }

  private async summaries(list: FeedbackSummary[]): Promise<FeedbackSummaryView[]> {
    const people = new Map<UserId, FeedbackPerson>()
    const places = new Map<WorkspaceId, FeedbackPlace>()
    const views: FeedbackSummaryView[] = []
    for (const summary of list) {
      views.push({ ...summary, author: await this.person(summary.authorId, people), place: await this.place(summary.workspaceId, places) })
    }
    return views
  }

  private async view(feedback: Feedback): Promise<FeedbackView> {
    const people = new Map<UserId, FeedbackPerson>()
    const replies = []
    for (const reply of feedback.replies) {
      replies.push({ ...reply, author: await this.person(reply.authorId, people) })
    }
    return { ...feedback, author: await this.person(feedback.authorId, people), place: await this.place(feedback.workspaceId, new Map()), replies }
  }
}

/**
 * Keeps only a same-site path, so the inbox can link it without opening a
 * redirect. Browsers read `\` as `/`, so backslashes and control characters go too.
 */
function parsePagePath(input: string | null | undefined): string | null {
  const path = input?.trim()
  // eslint-disable-next-line no-control-regex
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.length > FEEDBACK_PAGE_PATH_MAX_LENGTH || /[\\\u0000-\u001F\u007F]/.test(path)) {
    return null
  }
  return path
}
