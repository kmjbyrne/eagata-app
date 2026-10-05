import type { User } from '../entities/User'
import { InvalidInputError, NotFoundError } from '../errors'
import type { MediaService, StoredMedia } from '../media/MediaService'
import type { CurrentUser } from '../ports/CurrentUser'
import type { IdGenerator } from '../ports/IdGenerator'
import type { Repositories } from '../ports/Repositories'
import { requireUser } from '../services/access'
import { requirePlatformAdmin } from '../services/platform'
import type { WorkspaceAccess } from '../services/WorkspaceAccess'
import type { UserId, WorkspaceId } from '../values/Ids'
import { parseFeedbackKind, parseFeedbackStatus, type Feedback, type FeedbackId, type FeedbackReply, type FeedbackStatus } from './Feedback'
import type { FeedbackRepository, FeedbackSummary, HtmlSanitizer } from './ports'

export const FEEDBACK_SUBJECT_MAX_LENGTH = 255
export const FEEDBACK_PAGE_PATH_MAX_LENGTH = 2048

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
  /** The workspace they're in, for context. It must be one they can see. */
  from?: { org: string, workspace: string } | null
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

export type FeedbackSummaryView = FeedbackSummary & { author: FeedbackPerson, place: FeedbackPlace | null }

export type FeedbackView = Omit<Feedback, 'replies'> & {
  author: FeedbackPerson
  place: FeedbackPlace | null
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
 * Things people raise for the platform. Each person sees and answers only
 * their own, from anywhere in the app. Platform admins see everyone's, answer
 * them, and set their status.
 */
export class FeedbackService {
  constructor(private readonly adapters: FeedbackAdapters) {}

  private now() {
    return this.adapters.now?.() ?? new Date()
  }

  /** @throws NotFoundError if `from` names a workspace they can't see */
  async submit(input: FeedbackInput): Promise<FeedbackView> {
    const user = await requireUser(this.adapters.repositories, this.adapters.currentUser)
    const subject = input.subject.trim()
    if (!subject || subject.length > FEEDBACK_SUBJECT_MAX_LENGTH) {
      throw new InvalidFeedbackSubjectError(input.subject)
    }
    const from = input.from ? (await this.adapters.access.require(input.from.org, input.from.workspace)).workspace.id : null
    const now = this.now()
    const id = this.adapters.ids.next() as FeedbackId
    await this.adapters.feedback.create({
      id,
      authorId: user.id,
      workspaceId: from,
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

  /** The signed-in user's own feedback, latest activity first. */
  async listOwn(): Promise<FeedbackSummaryView[]> {
    const user = await requireUser(this.adapters.repositories, this.adapters.currentUser)
    return this.summaries(await this.adapters.feedback.list({ authorId: user.id }))
  }

  /** Someone else's feedback is not found, never forbidden, so ids reveal nothing. */
  async getOwn(id: string): Promise<FeedbackView> {
    return this.view(await this.requireOwn(id))
  }

  /** A reply on done feedback reopens it, so the platform sees it again. */
  async replyAsAuthor(id: string, body: string): Promise<FeedbackView> {
    const feedback = await this.requireOwn(id)
    await this.reply(feedback, feedback.authorId, false, body, feedback.status === 'done' ? 'new' : undefined)
    return this.view(await this.require(feedback.id))
  }

  /** Everyone's feedback, for platform admins. */
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

  /** Stores an image for a platform reply as the author's own, so they can open it. */
  async attachImage(id: string, bytes: Uint8Array): Promise<StoredMedia> {
    await requirePlatformAdmin(this.adapters.repositories, this.adapters.currentUser)
    const feedback = await this.require(id)
    return this.adapters.media.storeForUser(feedback.authorId, bytes)
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

  private async requireOwn(id: string): Promise<Feedback> {
    const user = await requireUser(this.adapters.repositories, this.adapters.currentUser)
    const feedback = await this.adapters.feedback.get(id as FeedbackId)
    if (!feedback || feedback.authorId !== user.id) {
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

  private async place(workspaceId: WorkspaceId | null, cache: Map<WorkspaceId, FeedbackPlace>): Promise<FeedbackPlace | null> {
    if (!workspaceId) {
      return null
    }
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
