import { $fetch } from '@nuxt/test-utils/e2e'
import { beforeAll, describe, expect, it } from 'vitest'
import type { HomeResponse, MeResponse } from '../shared/contracts/me'
import type { AccessibleOrgResponse, AccessibleWorkspaceResponse, ResolveSlugResponse } from '../shared/contracts/orgs'
import type { WorkspaceMemberResponse, WorkspaceResponse } from '../shared/contracts/workspaces'
import { Browser, createUser } from '../testing'
import { setupLayer } from './setup'

await setupLayer()

const json = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
const send = (method: string, body?: unknown) => ({ method, ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}) })

// Each run gets its own people and org, since the server's store is shared between test files.
const run = Math.random().toString(36).slice(2, 7)
const email = (name: string) => `${name}-${run}@example.com`
const acme = `acme-${run}`

const ada = new Browser()
const grace = new Browser()
const mary = new Browser()

beforeAll(async () => {
  for (const name of ['ada', 'grace', 'mary']) {
    await createUser(email(name), `${name[0]!.toUpperCase()}${name.slice(1)} ${run}`)
  }
  await ada.signIn({ email: email('ada'), name: `Ada ${run}` })
  await grace.signIn({ email: email('grace'), name: `Grace ${run}` })
  await mary.signIn({ email: email('mary'), name: `Mary ${run}` })
  await $fetch('/__test/company-org', {
    method: 'POST',
    body: { name: 'Acme', slug: acme, previousSlugs: [`old-${acme}`], members: [[email('ada'), 'owner'], [email('grace'), 'member']], workspaces: ['general', 'finance'] }
  })
})

describe('signed out', () => {
  it.each([
    ['GET', '/api/orgs'],
    ['GET', `/api/orgs/${acme}`],
    ['GET', `/api/orgs/old-${acme}/resolve`],
    ['GET', `/api/orgs/${acme}/workspaces`],
    ['POST', `/api/orgs/${acme}/workspaces`],
    ['GET', `/api/orgs/${acme}/workspaces/general/members`],
    ['POST', `/api/orgs/${acme}/workspaces/general/members`],
    ['PATCH', `/api/orgs/${acme}/workspaces/general/members/someone`],
    ['DELETE', `/api/orgs/${acme}/workspaces/general/members/someone`],
    ['PUT', '/api/me/last-workspace'],
    ['GET', '/api/me/home']
  ])('%s %s answers 401', async (method, path) => {
    const body = ['POST', 'PATCH', 'PUT'].includes(method) ? { name: 'x', email: 'x@example.com', role: 'viewer', org: acme, workspace: 'general' } : undefined
    expect((await new Browser().request(path, send(method, body))).status).toBe(401)
  })
})

describe('GET /api/orgs', () => {
  it('lists the personal org first, then shared ones, with roles and visible workspaces', async () => {
    const { body } = await ada.json<AccessibleOrgResponse[]>('/api/orgs')

    expect(body.map(entry => [entry.org.isPersonal, entry.role])).toEqual([[true, 'owner'], [false, 'owner']])
    expect(body[1]!.workspaces.map(workspace => [workspace.slug, workspace.role])).toEqual([['general', 'owner'], ['finance', 'owner']])
    expect(body[1]!.permissions).toEqual(['org.view', 'workspaces.create'])
    expect(body[1]!.workspaces[0]!.permissions).toEqual(['workspace.view', 'members.view', 'members.manage', 'media.upload'])
  })

  it('shows a plain org member only the workspaces they belong to', async () => {
    const { body } = await grace.json<AccessibleOrgResponse[]>('/api/orgs')

    expect(body.find(entry => entry.org.slug === acme)).toMatchObject({ role: 'member', permissions: ['org.view'], workspaces: [] })
  })
})

describe('GET /api/orgs/:org', () => {
  it('returns an org the user reaches, and 404 for anyone else', async () => {
    expect((await ada.json<AccessibleOrgResponse>(`/api/orgs/${acme}`)).body.org.name).toBe('Acme')
    expect((await mary.json(`/api/orgs/${acme}`)).status).toBe(404)
  })
})

describe('GET /api/orgs/:org/resolve', () => {
  it('gives members the current slug for an old one, and 404 to anyone else', async () => {
    expect((await grace.json<ResolveSlugResponse>(`/api/orgs/old-${acme}/resolve`)).body).toEqual({ slug: acme })
    expect((await mary.json(`/api/orgs/old-${acme}/resolve`)).status).toBe(404)
  })
})

describe('workspaces', () => {
  it('lets org owners create a workspace, and refuses plain members and outsiders', async () => {
    const created = await ada.json<WorkspaceResponse>(`/api/orgs/${acme}/workspaces`, json({ name: 'Marketing Team' }))

    expect(created).toMatchObject({ status: 201, body: { name: 'Marketing Team', slug: 'marketing-team' } })
    expect((await grace.request(`/api/orgs/${acme}/workspaces`, json({ name: 'Mine' }))).status).toBe(403)
    expect((await mary.request(`/api/orgs/${acme}/workspaces`, json({ name: 'Mine' }))).status).toBe(404)
  })

  it('answers 409 for a slug the org already uses, and 400 for a malformed body', async () => {
    const taken = await ada.json<{ data: { error: string } }>(`/api/orgs/${acme}/workspaces`, json({ name: 'General' }))

    expect(taken).toMatchObject({ status: 409, body: { data: { error: 'SlugTakenError' } } })
    expect((await ada.request(`/api/orgs/${acme}/workspaces`, json({}))).status).toBe(400)
  })

  it('lists the workspaces the user sees', async () => {
    expect((await ada.json<AccessibleWorkspaceResponse[]>(`/api/orgs/${acme}/workspaces`)).body.map(workspace => workspace.slug))
      .toEqual(expect.arrayContaining(['general', 'finance']))
  })
})

describe('workspace members', () => {
  const members = `/api/orgs/${acme}/workspaces/finance/members`

  it('lets an owner share a workspace by email, change the role, and remove the member', async () => {
    const me = (await mary.json<MeResponse>('/api/me')).body
    const added = await ada.json<WorkspaceMemberResponse>(members, json({ email: email('mary'), role: 'viewer' }))
    expect(added).toMatchObject({ status: 201, body: { role: 'viewer', user: { email: email('mary') } } })
    expect((await mary.json(`/api/orgs/${acme}/workspaces`)).status).toBe(200)

    expect((await ada.request(`${members}/${me.id}`, send('PATCH', { role: 'editor' }))).status).toBe(204)
    expect((await ada.json<WorkspaceMemberResponse[]>(members)).body.find(member => member.user.id === me.id)?.role).toBe('editor')

    expect((await ada.request(`${members}/${me.id}`, send('DELETE'))).status).toBe(204)
    expect((await mary.json(`/api/orgs/${acme}/workspaces`)).status).toBe(404)
  })

  it('refuses anyone but a workspace owner, and hides the workspace from outsiders', async () => {
    expect((await grace.request(members, json({ email: email('mary'), role: 'viewer' }))).status).toBe(404)
    expect((await mary.request(members)).status).toBe(404)
  })

  it('answers 404 for an email with no account', async () => {
    expect((await ada.request(members, json({ email: 'nobody@example.com', role: 'viewer' }))).status).toBe(404)
  })
})

describe('where home is', () => {
  it('sends a user who reaches several orgs to choose, then to the workspace they last used', async () => {
    expect((await ada.json<HomeResponse>('/api/me/home')).body).toEqual({ path: '/choose' })

    expect((await ada.request('/api/me/last-workspace', send('PUT', { org: acme, workspace: 'finance' }))).status).toBe(204)
    expect((await ada.json<HomeResponse>('/api/me/home')).body).toEqual({ path: `/${acme}/finance` })
  })

  it('takes the same user back to it after signing out and in again, and nobody else', async () => {
    const browser = new Browser()
    await browser.signIn({ email: email('ada') })
    await browser.request('/api/me/last-workspace', send('PUT', { org: acme, workspace: 'general' }))
    await browser.request('/api/auth/logout', send('POST'))

    await browser.signIn({ email: email('ada') })
    expect((await browser.json<HomeResponse>('/api/me/home')).body).toEqual({ path: `/${acme}/general` })

    await browser.request('/api/auth/logout', send('POST'))
    await browser.signIn({ email: email('grace') })
    expect((await browser.json<HomeResponse>('/api/me/home')).body).toEqual({ path: '/choose' })
  })

  it('won\'t remember a workspace the user can\'t reach', async () => {
    expect((await mary.request('/api/me/last-workspace', send('PUT', { org: acme, workspace: 'finance' }))).status).toBe(404)
  })

  it('sends a new user to their personal workspace', async () => {
    await createUser(email('newcomer'), `Newcomer ${run}`)
    const newcomer = new Browser()
    await newcomer.signIn({ email: email('newcomer'), name: `Newcomer ${run}` })

    expect((await newcomer.json<HomeResponse>('/api/me/home')).body.path).toMatch(/^\/newcomer-[a-z0-9]+\/general$/)
  })
})
