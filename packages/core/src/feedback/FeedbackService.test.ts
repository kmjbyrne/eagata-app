import { describe, expect, it } from 'vitest'
import { ForbiddenError, InvalidInputError, NotFoundError } from '../errors'
import { MediaService } from '../media/MediaService'
import { PNG_BYTES } from '../media/testing'
import { companyOrg } from '../testing/companyOrg'
import { createTestServices } from '../testing/createTestServices'
import { feedbackRepositoryContract } from '../testing/feedbackRepositoryContract'
import { InMemoryMediaStorage } from '../testing/InMemoryMediaStorage'
import { EmptyFeedbackBodyError, FeedbackService, InvalidFeedbackSubjectError } from './FeedbackService'
import { InMemoryFeedbackRepository, StripScriptsSanitizer } from './InMemoryFeedbackRepository'

async function setup() {
  const t = createTestServices()
  let minute = 0
  const now = () => new Date(Date.UTC(2026, 5, 1, 12, minute++))
  const media = new MediaService({ repositories: t.repositories, currentUser: t.currentUser, access: t.services.workspaceAccess, storage: new InMemoryMediaStorage() })
  const service = new FeedbackService({
    repositories: t.repositories,
    currentUser: t.currentUser,
    access: t.services.workspaceAccess,
    feedback: new InMemoryFeedbackRepository(),
    sanitizer: new StripScriptsSanitizer(),
    media,
    ids: t.ids,
    now
  })
  const ada = await t.addUser('Ada Lovelace')
  const grace = await t.addUser('Grace Hopper')
  const pat = await t.addUser('Pat Platform', { platformAdmin: true })
  const { workspaces: [general] } = await companyOrg(t.repositories, { name: 'Acme', slug: 'acme', members: [[ada, 'owner'], [grace, 'member']] })
  await t.repositories.workspaceMembers.add({ workspaceId: general!.id, userId: grace.id, role: 'viewer' })
  return { t, service, ada, grace, pat }
}

const input = { kind: 'bug', subject: ' Images vanish ', body: '<p>On save</p><script>x()</script>', pagePath: '/acme/general/editor' }

describe('FeedbackService for members', () => {
  it('lets any member, viewers included, raise feedback, trimmed and sanitised', async () => {
    const { t, service, grace } = await setup()
    t.signInAs(grace)
    const feedback = await service.submit('acme', 'general', input)

    expect(feedback).toMatchObject({
      subject: 'Images vanish',
      body: '<p>On save</p>',
      kind: 'bug',
      status: 'new',
      pagePath: '/acme/general/editor',
      author: { id: grace.id, displayName: 'Grace Hopper' },
      place: { workspaceName: 'general', workspaceSlug: 'general', orgName: 'Acme', orgSlug: 'acme' },
      replies: []
    })
  })

  it('refuses a missing subject, an empty body, an unknown kind, and drops an off-site page path', async () => {
    const { t, service, grace } = await setup()
    t.signInAs(grace)

    await expect(service.submit('acme', 'general', { ...input, subject: '  ' })).rejects.toThrow(InvalidFeedbackSubjectError)
    await expect(service.submit('acme', 'general', { ...input, body: '<p> </p><script>x()</script>' })).rejects.toThrow(EmptyFeedbackBodyError)
    await expect(service.submit('acme', 'general', { ...input, kind: 'rant' })).rejects.toThrow(InvalidInputError)
    expect((await service.submit('acme', 'general', { ...input, pagePath: '//evil.example.com' })).pagePath).toBeNull()
    expect((await service.submit('acme', 'general', { ...input, body: '<img src="/media/x.png">' })).body).toBe('<img src="/media/x.png">')
  })

  it('shows members only their own feedback, and someone else\'s is not found', async () => {
    const { t, service, ada, grace } = await setup()
    t.signInAs(grace)
    const own = await service.submit('acme', 'general', input)
    t.signInAs(ada)
    await service.submit('acme', 'general', { ...input, subject: 'Ada\'s' })

    expect((await service.listOwn('acme', 'general')).map(entry => entry.subject)).toEqual(['Ada\'s'])
    await expect(service.getOwn('acme', 'general', own.id)).rejects.toThrow(NotFoundError)
    await expect(service.replyAsAuthor('acme', 'general', own.id, '<p>Me too</p>')).rejects.toThrow(NotFoundError)
  })

  it('reopens done feedback when its author replies', async () => {
    const { t, service, grace, pat } = await setup()
    t.signInAs(grace)
    const feedback = await service.submit('acme', 'general', input)
    t.signInAs(pat)
    await service.setStatus(feedback.id, 'done')
    t.signInAs(grace)

    const reopened = await service.replyAsAuthor('acme', 'general', feedback.id, '<p>Still broken</p>')
    expect(reopened.status).toBe('new')
    expect(reopened.replies).toMatchObject([{ fromPlatform: false, body: '<p>Still broken</p>', author: { displayName: 'Grace Hopper' } }])
  })
})

describe('FeedbackService for platform admins', () => {
  it('lists every workspace\'s feedback, latest activity first, and refuses anyone else', async () => {
    const { t, service, ada, grace, pat } = await setup()
    t.signInAs(grace)
    const first = await service.submit('acme', 'general', input)
    t.signInAs(ada)
    await service.submit('acme', 'general', { ...input, subject: 'Second' })
    t.signInAs(pat)
    await service.replyAsPlatform(first.id, '<p>On it</p>')

    expect((await service.listAll()).map(entry => [entry.subject, entry.replyCount])).toEqual([['Images vanish', 1], ['Second', 0]])
    t.signInAs(ada)
    await expect(service.listAll()).rejects.toThrow(ForbiddenError)
    await expect(service.get(first.id)).rejects.toThrow(ForbiddenError)
  })

  it('marks new feedback seen on the first reply, and sets any status', async () => {
    const { t, service, grace, pat } = await setup()
    t.signInAs(grace)
    const feedback = await service.submit('acme', 'general', input)
    t.signInAs(pat)

    expect((await service.replyAsPlatform(feedback.id, '<p>Looking</p>')).status).toBe('seen')
    expect((await service.setStatus(feedback.id, 'done')).status).toBe('done')
    await expect(service.setStatus(feedback.id, 'closed')).rejects.toThrow(InvalidInputError)
    await expect(service.get('missing')).rejects.toThrow(NotFoundError)
  })

  it('attaches an image in the feedback\'s workspace, where its author can see it', async () => {
    const { t, service, grace, pat } = await setup()
    t.signInAs(grace)
    const feedback = await service.submit('acme', 'general', input)
    t.signInAs(pat)

    expect((await service.attachImage(feedback.id, PNG_BYTES)).key).toMatch(new RegExp(`^workspaces/${feedback.workspaceId}/`))
  })
})

feedbackRepositoryContract(() => new InMemoryFeedbackRepository())
