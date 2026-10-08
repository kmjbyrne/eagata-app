import { fileURLToPath } from 'node:url'
import { PNG_BYTES } from '@kmjbyrne/core/media/testing'
import { $fetch } from '@nuxt/test-utils/e2e'
import { Browser, createUser, setupApp } from '@kmjbyrne/nuxt-shell/testing'
import { beforeAll, describe, expect, it } from 'vitest'
import type { StoredMediaResponse } from '../shared/contracts/media'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

await setupApp(here('..'), {}, { plugins: [here('./server/testMedia.ts')] })

function upload(browser: Browser, path: string, bytes: Uint8Array) {
  const form = new FormData()
  form.append('file', new Blob([bytes.slice().buffer as ArrayBuffer]), 'screenshot.png')
  return browser.request(path, { method: 'POST', body: form })
}

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

const ada = new Browser()
const outsider = new Browser()
const pat = new Browser()

beforeAll(async () => {
  await createUser('ada@example.com', 'Ada Lovelace')
  await createUser('outsider@example.com', 'Out Sider')
  await createUser('pat@example.com', 'Pat Platform')
  await $fetch('/__test/platform-admin', { method: 'POST', body: { email: 'pat@example.com' } })
  await ada.signIn({ email: 'ada@example.com' })
  await outsider.signIn({ email: 'outsider@example.com' })
  await pat.signIn({ email: 'pat@example.com' })
})

describe('uploading and reading media', () => {
  it('stores an image, then serves it to its workspace and platform admins only, cached privately', async () => {
    const response = await upload(ada, '/api/orgs/ada-lovelace/workspaces/general/media', PNG_BYTES)
    expect(response.status).toBe(201)
    const { src } = await response.json() as StoredMediaResponse

    const own = await ada.request(src)
    expect(own.status).toBe(200)
    expect(own.headers.get('content-type')).toBe('image/png')
    expect(own.headers.get('cache-control')).toBe('private, max-age=31536000, immutable')
    expect(own.headers.get('content-security-policy')).toBe('default-src \'none\'')
    expect(own.headers.get('x-frame-options')).toBe('DENY')
    expect(new Uint8Array(await own.arrayBuffer())).toEqual(PNG_BYTES)
    expect((await pat.request(src)).status).toBe(200)
    expect((await outsider.request(src)).status).toBe(404)
    expect((await new Browser().request(src)).status).toBe(401)
  })

  it('refuses a file that isn\'t an image, and an upload to someone else\'s workspace', async () => {
    expect((await upload(ada, '/api/orgs/ada-lovelace/workspaces/general/media', new TextEncoder().encode('<svg/>'))).status).toBe(400)
    expect((await upload(outsider, '/api/orgs/ada-lovelace/workspaces/general/media', PNG_BYTES)).status).toBe(404)
  })

  it('stores a person\'s own image, for them and platform admins only', async () => {
    const response = await upload(ada, '/api/me/media', PNG_BYTES)
    const { key, src } = await response.json() as StoredMediaResponse

    expect(response.status).toBe(201)
    expect(key).toMatch(/^users\//)
    expect((await ada.request(src)).status).toBe(200)
    expect((await pat.request(src)).status).toBe(200)
    expect((await outsider.request(src)).status).toBe(404)
  })

  it('checks who\'s asking before reading a body, and never reads one without a length or over the limit', async () => {
    const workspace = '/api/orgs/ada-lovelace/workspaces/general/media'

    expect(await uploadEndless(new Browser(), '/api/me/media')).toBe(401)
    expect(await uploadEndless(new Browser(), workspace)).toBe(401)
    expect(await uploadEndless(outsider, workspace)).toBe(404)
    expect(await uploadEndless(ada, workspace)).toBe(411)
    expect(await uploadEndless(ada, '/api/me/media')).toBe(411)
    expect((await upload(ada, workspace, new Uint8Array(16 * 1024 * 1024))).status).toBe(413)
  })

  it('answers not found for a key that isn\'t one', async () => {
    expect((await ada.request('/media/workspaces/x/..%2F..%2Fetc%2Fpasswd')).status).toBe(404)
  })
})
