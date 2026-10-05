import { fileURLToPath } from 'node:url'
import { $fetch } from '@nuxt/test-utils/e2e'
import { Browser, createUser, setupApp } from '@kmjbyrne/nuxt-shell/testing'
import { beforeAll, describe, expect, it } from 'vitest'
import type { PlatformOrg, PlatformOrgDetailResponse, PlatformOrgSummaryResponse, PlatformUserDetailResponse, PlatformUserSummary } from '../shared/contracts/platform'

await setupApp(fileURLToPath(new URL('..', import.meta.url)))

const send = (method: string, body?: unknown) =>
  ({ method, ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}) })

const pat = new Browser()
const ada = new Browser()
let adaId = ''
let graceId = ''

beforeAll(async () => {
  await createUser('pat@example.com', 'Pat Platform')
  adaId = (await createUser('ada@example.com', 'Ada Lovelace')).id
  graceId = (await createUser('grace@example.com', 'Grace Hopper')).id
  await $fetch('/__test/platform-admin', { method: 'POST', body: { email: 'pat@example.com' } })
  await pat.signIn({ email: 'pat@example.com' })
  await ada.signIn({ email: 'ada@example.com' })
})

describe('access', () => {
  it.each([
    ['GET', '/api/protected/organizations'],
    ['POST', '/api/protected/organizations'],
    ['GET', '/api/protected/organizations/acme'],
    ['PATCH', '/api/protected/organizations/acme/slug'],
    ['GET', '/api/protected/organizations/acme/members'],
    ['POST', '/api/protected/organizations/acme/members'],
    ['PATCH', '/api/protected/organizations/acme/members/someone'],
    ['DELETE', '/api/protected/organizations/acme/members/someone'],
    ['GET', '/api/protected/users'],
    ['POST', '/api/protected/users'],
    ['GET', '/api/protected/users/someone'],
    ['PATCH', '/api/protected/users/someone']
  ])('%s %s answers 401 signed out and 403 to anyone but a platform admin', async (method, path) => {
    const body = method === 'GET' || method === 'DELETE' ? undefined : {}
    expect((await new Browser().request(path, send(method, body))).status).toBe(401)
    expect((await ada.request(path, send(method, body))).status).toBe(403)
  })
})

describe('organizations', () => {
  it('creates a company org with its owner and a General workspace, and lists it', async () => {
    const created = await pat.json<PlatformOrg>('/api/protected/organizations', send('POST', { name: 'Acme Ltd', ownerUserId: adaId }))
    expect(created).toMatchObject({ status: 201, body: { name: 'Acme Ltd', slug: 'acme', isPersonal: false } })

    const detail = (await pat.json<PlatformOrgDetailResponse>('/api/protected/organizations/acme')).body
    expect(detail.members.map(member => [member.user.email, member.role, member.user.hasSignedIn])).toEqual([['ada@example.com', 'owner', true]])
    expect(detail.workspaces.map(workspace => workspace.slug)).toEqual(['general'])

    const list = (await pat.json<PlatformOrgSummaryResponse[]>('/api/protected/organizations')).body
    expect(list.find(row => row.org.slug === 'acme')).toMatchObject({ memberCount: 1, workspaceCount: 1 })
  })

  it('answers 409 for a taken slug, and 404 for an owner who doesn\'t exist', async () => {
    expect((await pat.request('/api/protected/organizations', send('POST', { name: 'Acme', ownerUserId: adaId }))).status).toBe(409)
    expect((await pat.request('/api/protected/organizations', send('POST', { name: 'Ghost Co', ownerUserId: 'nobody' }))).status).toBe(404)
  })

  it('manages members, keeping an owner', async () => {
    const members = '/api/protected/organizations/acme/members'
    expect((await pat.request(members, send('POST', { userId: graceId, role: 'member' }))).status).toBe(204)
    expect((await pat.request(`${members}/${graceId}`, send('PATCH', { role: 'admin' }))).status).toBe(204)
    expect((await pat.json<PlatformOrgDetailResponse['members']>(members)).body.map(member => member.role)).toEqual(['owner', 'admin'])

    const lastOwner = await pat.json<{ data: { error: string } }>(`${members}/${adaId}`, send('DELETE'))
    expect(lastOwner).toMatchObject({ status: 409, body: { data: { error: 'LastOwnerError' } } })

    expect((await pat.request(`${members}/${graceId}`, send('DELETE'))).status).toBe(204)
  })

  it('changes the slug, keeping the old one for redirects', async () => {
    const changed = await pat.json<PlatformOrg>('/api/protected/organizations/acme/slug', send('PATCH', { slug: 'acme-co' }))

    expect(changed.body).toMatchObject({ slug: 'acme-co', previousSlugs: ['acme'] })
    expect((await ada.json<{ slug: string }>('/api/orgs/acme/resolve')).body).toEqual({ slug: 'acme-co' })
  })
})

describe('users', () => {
  it('creates a user with a personal org, who has not signed in yet', async () => {
    const created = await pat.json<PlatformUserSummary>('/api/protected/users', send('POST', { displayName: 'Mary Somerville', email: 'Mary@Example.com' }))
    expect(created).toMatchObject({ status: 201, body: { email: 'mary@example.com', hasSignedIn: false, isPlatformAdmin: false } })

    const detail = (await pat.json<PlatformUserDetailResponse>(`/api/protected/users/${created.body.id}`)).body
    expect(detail.orgs.map(entry => [entry.org.isPersonal, entry.role])).toEqual([[true, 'owner']])
    expect((await pat.request('/api/protected/users', send('POST', { displayName: 'Again', email: 'mary@example.com' }))).status).toBe(409)
  })

  it('lets a created user sign in', async () => {
    await pat.request('/api/protected/users', send('POST', { displayName: 'Katherine Johnson', email: 'katherine@example.com' }))

    expect((await new Browser().signIn({ email: 'katherine@example.com' })).headers.get('location')).toBe('/')
  })

  it('grants and revokes the platform role, one change per request', async () => {
    expect((await pat.json<PlatformUserSummary>(`/api/protected/users/${graceId}`, send('PATCH', { isPlatformAdmin: true }))).body.isPlatformAdmin).toBe(true)
    expect((await pat.json<PlatformUserSummary>(`/api/protected/users/${graceId}`, send('PATCH', { isPlatformAdmin: false }))).body.isPlatformAdmin).toBe(false)
    expect((await pat.request(`/api/protected/users/${graceId}`, send('PATCH', { isPlatformAdmin: true, deactivated: true }))).status).toBe(400)
  })

  it('deactivates a user, ending their session, and reactivates them', async () => {
    const deactivated = await pat.json<PlatformUserSummary>(`/api/protected/users/${adaId}`, send('PATCH', { deactivated: true }))
    expect(deactivated.body.deactivatedAt).not.toBeNull()
    expect((await ada.json('/api/me')).status).toBe(401)

    await pat.request(`/api/protected/users/${adaId}`, send('PATCH', { deactivated: false }))
    expect((await ada.json('/api/me')).status).toBe(200)
  })

  it('keeps the platform admin from deactivating themselves or revoking the last platform admin', async () => {
    const me = (await pat.json<{ id: string }>('/api/me')).body

    expect((await pat.request(`/api/protected/users/${me.id}`, send('PATCH', { deactivated: true }))).status).toBe(403)
    expect((await pat.request(`/api/protected/users/${me.id}`, send('PATCH', { isPlatformAdmin: false }))).status).toBe(409)
  })
})
