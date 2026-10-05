import { describe, expect, it } from 'vitest'
import type { Feedback, FeedbackId } from '../feedback/Feedback'
import type { FeedbackRepository } from '../feedback/ports'
import type { UserId, WorkspaceId } from '../values/Ids'

let sequence = 0
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++sequence}`
const at = (minute: number) => new Date(Date.UTC(2026, 5, 1, 12, minute, 0, 123))

/**
 * The behaviour every `FeedbackRepository` shares. `createPlace` stores the
 * workspace and user that feedback refers to, for stores with foreign keys.
 */
export function feedbackRepositoryContract(
  createRepository: () => Promise<FeedbackRepository> | FeedbackRepository,
  createPlace: (place: { workspaceId: WorkspaceId, userId: UserId }) => Promise<void> = async () => {}
) {
  async function setup() {
    const repository = await createRepository()
    const place = { workspaceId: id('ws') as WorkspaceId, userId: id('user') as UserId }
    await createPlace(place)
    const make = (overrides: Partial<Omit<Feedback, 'replies'>> = {}): Omit<Feedback, 'replies'> => ({
      id: id('fb') as FeedbackId,
      workspaceId: place.workspaceId,
      authorId: place.userId,
      kind: 'bug',
      subject: 'Images vanish',
      body: '<p>On save</p>',
      pagePath: '/acme/general',
      status: 'new',
      createdAt: at(0),
      updatedAt: at(0),
      ...overrides
    })
    return { repository, place, make }
  }

  describe('FeedbackRepository contract', () => {
    it('stores feedback and reads it back whole', async () => {
      const { repository, make } = await setup()
      const feedback = make()
      await repository.create(feedback)

      expect(await repository.get(feedback.id)).toEqual({ ...feedback, replies: [] })
      expect(await repository.get('missing' as FeedbackId)).toBeNull()
    })

    it('adds replies oldest first, moving updatedAt and setting the status in the same write', async () => {
      const { repository, place, make } = await setup()
      const feedback = make()
      await repository.create(feedback)
      const first = { id: id('reply'), authorId: place.userId, fromPlatform: true, body: '<p>Looking</p>', createdAt: at(1) }
      const second = { id: id('reply'), authorId: place.userId, fromPlatform: false, body: '<p>Thanks</p>', createdAt: at(2) }
      await repository.addReply(feedback.id, first, 'seen')
      await repository.addReply(feedback.id, second)

      expect(await repository.get(feedback.id)).toMatchObject({ status: 'seen', updatedAt: at(2), replies: [first, second] })
    })

    it('sets the status and moves updatedAt', async () => {
      const { repository, make } = await setup()
      const feedback = make()
      await repository.create(feedback)
      await repository.setStatus(feedback.id, 'done', at(5))

      expect(await repository.get(feedback.id)).toMatchObject({ status: 'done', updatedAt: at(5) })
    })

    it('lists latest activity first, as summaries, filtered to one author in one workspace', async () => {
      const { repository, place, make } = await setup()
      const older = make({ subject: 'Older', updatedAt: at(1) })
      const newer = make({ subject: 'Newer', updatedAt: at(3) })
      await repository.create(older)
      await repository.create(newer)
      await repository.addReply(older.id, { id: id('reply'), authorId: place.userId, fromPlatform: true, body: '<p>Hi</p>', createdAt: at(4) })

      const own = await repository.list({ workspaceId: place.workspaceId, authorId: place.userId })
      expect(own.map(entry => [entry.subject, entry.replyCount])).toEqual([['Older', 1], ['Newer', 0]])
      expect(own[0]).not.toHaveProperty('body')
      expect((await repository.list()).map(entry => entry.id)).toEqual(expect.arrayContaining([older.id, newer.id]))
      expect(await repository.list({ workspaceId: place.workspaceId, authorId: 'someone-else' as UserId })).toEqual([])
    })
  })
}
