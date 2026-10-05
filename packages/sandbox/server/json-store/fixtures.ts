import { membershipId, workspaceMemberId, type MembershipRecord, type OrgRecord, type UserRecord, type WorkspaceMemberRecord, type WorkspaceRecord } from './records'

export interface TenancyFixtures {
  users: UserRecord[]
  orgs: OrgRecord[]
  workspaces: WorkspaceRecord[]
  memberships: MembershipRecord[]
  workspaceMembers: WorkspaceMemberRecord[]
}

const day = (n: number): string => new Date(Date.UTC(2026, 0, n)).toISOString()

/**
 * A small world that exercises every rule:
 *
 * - Pat runs the platform, and belongs to no company.
 * - Ada owns Acme. Grace is an Acme admin who isn't its owner.
 * - Grace is also a plain member of Globex, so she reaches two companies.
 * - Alan is a plain Acme member, who sees only the workspace he was added to.
 * - Katherine owns Globex.
 * - Mary has only her personal org, plus Ada's personal workspace, shared with her.
 * - Dana was an Acme member until a platform admin deactivated her: she can't sign in.
 * - Acme was once "acme-old", so old links redirect.
 *
 * Every user has a personal org with a General workspace. Nobody has signed
 * in yet: the sandbox's sign-in links their account on first use.
 */
export function defaultTenancyFixtures(): TenancyFixtures {
  const people = [
    { key: 'pat', name: 'Pat Platform', slug: 'pat-platform', isPlatformAdmin: true },
    { key: 'ada', name: 'Ada Lovelace', slug: 'ada-lovelace' },
    { key: 'grace', name: 'Grace Hopper', slug: 'grace-hopper' },
    { key: 'alan', name: 'Alan Turing', slug: 'alan-turing' },
    { key: 'katherine', name: 'Katherine Johnson', slug: 'katherine-johnson' },
    { key: 'mary', name: 'Mary Somerville', slug: 'mary-somerville' },
    { key: 'dana', name: 'Dana Deactivated', slug: 'dana-deactivated', deactivatedAt: day(3) }
  ]
  const users: UserRecord[] = people.map(person => ({
    id: `user-${person.key}`,
    displayName: person.name,
    email: `${person.key}@example.com`,
    avatarUrl: null,
    isPlatformAdmin: person.isPlatformAdmin ?? false,
    identities: [],
    deactivatedAt: person.deactivatedAt ?? null
  }))

  const orgs: OrgRecord[] = [
    ...people.map(person => ({ id: `org-${person.key}`, name: person.name, slug: person.slug, previousSlugs: [], isPersonal: true })),
    { id: 'org-acme', name: 'Acme Ltd', slug: 'acme', previousSlugs: ['acme-old'], isPersonal: false },
    { id: 'org-globex', name: 'Globex Corporation', slug: 'globex', previousSlugs: [], isPersonal: false }
  ]

  const workspaces: WorkspaceRecord[] = [
    ...people.map(person => ({ id: `ws-${person.key}-general`, orgId: `org-${person.key}`, name: 'General', slug: 'general', createdAt: day(1) })),
    { id: 'ws-acme-general', orgId: 'org-acme', name: 'General', slug: 'general', createdAt: day(1) },
    { id: 'ws-acme-finance', orgId: 'org-acme', name: 'Finance', slug: 'finance', createdAt: day(2) },
    { id: 'ws-globex-general', orgId: 'org-globex', name: 'General', slug: 'general', createdAt: day(1) },
    { id: 'ws-globex-research', orgId: 'org-globex', name: 'Research', slug: 'research', createdAt: day(2) }
  ]

  const member = (orgId: string, userId: string, role: MembershipRecord['role']): MembershipRecord =>
    ({ id: membershipId(orgId, userId), orgId, userId, role })
  const memberships: MembershipRecord[] = [
    ...people.map(person => member(`org-${person.key}`, `user-${person.key}`, 'owner')),
    member('org-acme', 'user-ada', 'owner'),
    member('org-acme', 'user-grace', 'admin'),
    member('org-acme', 'user-alan', 'member'),
    member('org-acme', 'user-dana', 'member'),
    member('org-globex', 'user-katherine', 'owner'),
    member('org-globex', 'user-grace', 'member')
  ]

  const share = (workspaceId: string, userId: string, role: WorkspaceMemberRecord['role']): WorkspaceMemberRecord =>
    ({ id: workspaceMemberId(workspaceId, userId), workspaceId, userId, role })
  const workspaceMembers: WorkspaceMemberRecord[] = [
    ...people.map(person => share(`ws-${person.key}-general`, `user-${person.key}`, 'owner')),
    share('ws-acme-general', 'user-ada', 'owner'),
    share('ws-acme-finance', 'user-ada', 'owner'),
    share('ws-acme-finance', 'user-alan', 'viewer'),
    share('ws-acme-general', 'user-dana', 'viewer'),
    share('ws-globex-general', 'user-katherine', 'owner'),
    share('ws-globex-general', 'user-grace', 'editor'),
    share('ws-globex-research', 'user-katherine', 'owner'),
    share('ws-ada-general', 'user-mary', 'editor')
  ]

  return { users, orgs, workspaces, memberships, workspaceMembers }
}
