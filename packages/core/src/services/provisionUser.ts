import type { User } from '../entities/User'
import { DEFAULT_WORKSPACE } from '../entities/Workspace'
import type { IdGenerator } from '../ports/IdGenerator'
import type { TenancyRepositories } from '../ports/TenancyStore'
import type { Email } from '../values/Email'
import type { OrgId, UserId, WorkspaceId } from '../values/Ids'
import { NAME_MAX_LENGTH, parseName } from '../values/Name'
import { parseSlug, RESERVED_ORG_SLUGS, SLUG_MAX_LENGTH, suggestSlug, type Slug } from '../values/Slug'

export interface NewUser {
  displayName: string
  email: Email
  isPlatformAdmin?: boolean
}

/**
 * Creates a user with their personal org, its first workspace, and both
 * memberships. Every user has a personal org, however they were created.
 * Call inside a transaction.
 */
export async function provisionUser(repositories: TenancyRepositories, ids: IdGenerator, input: NewUser): Promise<User> {
  const user: User = {
    id: ids.next() as UserId,
    displayName: parseName(input.displayName.slice(0, NAME_MAX_LENGTH)),
    email: input.email,
    avatarUrl: null,
    isPlatformAdmin: input.isPlatformAdmin ?? false,
    identities: []
  }
  await repositories.users.create(user)

  const orgId = ids.next() as OrgId
  await repositories.orgs.create({
    id: orgId,
    name: user.displayName,
    slug: await freeOrgSlug(repositories, user.displayName, user.email),
    previousSlugs: [],
    isPersonal: true
  })
  await repositories.memberships.add({ orgId, userId: user.id, role: 'owner' })

  const workspaceId = ids.next() as WorkspaceId
  await repositories.workspaces.create({
    id: workspaceId,
    orgId,
    name: parseName(DEFAULT_WORKSPACE.name),
    slug: parseSlug(DEFAULT_WORKSPACE.slug),
    createdAt: new Date()
  })
  await repositories.workspaceMembers.add({ workspaceId, userId: user.id, role: 'owner' })
  return user
}

/** The slug suggested by the name, or the email if the name has no letters, with -2, -3... until free. */
async function freeOrgSlug(repositories: TenancyRepositories, name: string, email: Email): Promise<Slug> {
  const base = suggestFrom(name) ?? suggestFrom(email.split('@')[0]!) ?? parseSlug('user')
  for (let n = 1; ; n++) {
    const suffix = n === 1 ? '' : `-${n}`
    const candidate = parseSlug(`${base.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, '')}${suffix}`)
    if (!RESERVED_ORG_SLUGS.includes(candidate) && !(await repositories.orgs.findBySlugOrPrevious(candidate))) {
      return candidate
    }
  }
}

function suggestFrom(text: string): Slug | null {
  try {
    return suggestSlug(text)
  } catch {
    return null
  }
}
