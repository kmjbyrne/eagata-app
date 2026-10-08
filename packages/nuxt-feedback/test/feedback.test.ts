import { fileURLToPath } from 'node:url'
import { PNG_BYTES } from '@kmjbyrne/core/media/testing'
import { $fetch } from '@nuxt/test-utils/e2e'
import { Browser, createUser, setupApp } from '@kmjbyrne/nuxt-shell/testing'
import { beforeAll, describe, expect, it } from 'vitest'
import type { FeedbackResponse, FeedbackSummaryResponse } from '../shared/contracts/feedback'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// The platform sub-layer, which extends the author's side too, so one build covers both.
await setupApp(here('../platform'), {}, { plugins: [here('./server/testFeedback.ts')] })

const json = (method: string, body?: unknown) =>
  ({ method, ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}) })

const own = '/api/me/feedback'
const ada = new Browser()
const outsider = new Browser()
const pat = new Browser()

/**
 * Posts a chunked body that sends one chunk, then never ends, so a server that
 * read the body before answering would never answer.
 */
async function uploadEndless(browser: Browser, path: string): Promise<number> {
  const body = new ReadableStream<Uint8Array>({
    start: controller => controller.enqueue(new Uint8Array(64 * 1024)),
    pull: () => new Promise(() => {})
  })
  const abort = new AbortController()
  const init = { method: 'POST', body, duplex: 'half', signal: abort.signal, headers: { 'content-type': 'multipart/form-data; boundary=x' } }
  const response = await browser.request(path, init as RequestInit)
  abort.abort()
  return response.status
}

async function submit(subject = 'Images vanish') {
  return (await ada.json<FeedbackResponse>(own, json('POST', { kind: 'bug', subject, body: '<p>On save</p><script>x()</script>', pagePath: '/ada-lovelace/general' }))).body
}

beforeAll(async () => {
  await createUser('ada@example.com', 'Ada Lovelace')
  await createUser('outsider@example.com', 'Out Sider')
  await createUser('pat@example.com', 'Pat Platform')
  await $fetch('/__test/platform-admin', { method: 'POST', body: { email: 'pat@example.com' } })
  await ada.signIn({ email: 'ada@example.com' })
  await outsider.signIn({ email: 'outsider@example.com' })
  await pat.signIn({ email: 'pat@example.com' })
})

describe('a person\'s own feedback', () => {
  it('lets anyone raise feedback, sanitised, with the workspace they sent it from, and see only their own', async () => {
    const response = await ada.json<FeedbackResponse>(own, json('POST', { kind: 'bug', subject: ' Sanitised ', body: '<p>Hi</p><script>x()</script>', from: { org: 'ada-lovelace', workspace: 'general' } }))

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ subject: 'Sanitised', body: '<p>Hi</p>', status: 'new', author: { displayName: 'Ada Lovelace' }, place: { orgSlug: 'ada-lovelace', workspaceSlug: 'general' } })
    expect((await ada.json<FeedbackSummaryResponse[]>(own)).body.map(item => item.subject)).toContain('Sanitised')
    expect((await outsider.json<FeedbackSummaryResponse[]>(own)).body.map(item => item.id)).not.toContain(response.body.id)
    expect((await outsider.request(`${own}/${response.body.id}`)).status).toBe(404)
    expect((await new Browser().request(own)).status).toBe(401)
  })

  it('refuses a workspace the author can\'t see as context, and takes none', async () => {
    expect((await outsider.request(own, json('POST', { kind: 'bug', subject: 'x', body: '<p>x</p>', from: { org: 'ada-lovelace', workspace: 'general' } }))).status).toBe(404)
    expect((await outsider.json<FeedbackResponse>(own, json('POST', { kind: 'idea', subject: 'From settings', body: '<p>x</p>' }))).body.place).toBeNull()
  })

  it('refuses an empty subject or body with 400', async () => {
    expect((await ada.request(own, json('POST', { kind: 'bug', subject: ' ', body: '<p>x</p>' }))).status).toBe(400)
    expect((await ada.request(own, json('POST', { kind: 'bug', subject: 'x', body: '<p></p>' }))).status).toBe(400)
  })
})

describe('the platform inbox', () => {
  it('lists every workspace\'s feedback for platform admins only', async () => {
    const feedback = await submit('For the inbox')

    expect((await pat.json<FeedbackSummaryResponse[]>('/api/protected/feedback')).body.map(item => item.id)).toContain(feedback.id)
    expect((await ada.request('/api/protected/feedback')).status).toBe(403)
    expect((await ada.request(`/api/protected/feedback/${feedback.id}`)).status).toBe(403)
  })

  it('replies, marking new feedback seen, sets the status, and the author\'s reply reopens it', async () => {
    const feedback = await submit('A conversation')
    const path = `/api/protected/feedback/${feedback.id}`

    expect((await pat.json<FeedbackResponse>(`${path}/replies`, json('POST', { body: '<p>Looking</p>' }))).body).toMatchObject({ status: 'seen', replies: [{ fromPlatform: true, body: '<p>Looking</p>' }] })
    expect((await pat.json<FeedbackResponse>(`${path}/status`, json('PUT', { status: 'done' }))).body.status).toBe('done')
    expect((await pat.request(`${path}/status`, json('PUT', { status: 'closed' }))).status).toBe(400)
    expect((await ada.json<FeedbackResponse>(`${own}/${feedback.id}/replies`, json('POST', { body: '<p>Still broken</p>' }))).body.status).toBe('new')
  })

  it('stores a platform reply\'s image as the author\'s own, so the author can open it', async () => {
    const feedback = await submit('With a screenshot')
    const form = new FormData()
    form.append('file', new Blob([PNG_BYTES.slice().buffer as ArrayBuffer]), 'shot.png')
    const response = await pat.request(`/api/protected/feedback/${feedback.id}/media`, { method: 'POST', body: form })
    const { src } = await response.json() as { src: string }

    expect(response.status).toBe(201)
    expect((await ada.request(src)).status).toBe(200)
    expect((await outsider.request(src)).status).toBe(404)
  })

  it('checks who\'s asking before reading a reply\'s image, and never reads one without a length', async () => {
    const path = `/api/protected/feedback/${(await submit('Endless')).id}/media`

    expect(await uploadEndless(new Browser(), path)).toBe(401)
    expect(await uploadEndless(ada, path)).toBe(403)
    expect(await uploadEndless(pat, '/api/protected/feedback/missing/media')).toBe(404)
    expect(await uploadEndless(pat, path)).toBe(411)
  })
})
