import type { OrgRole } from '../entities/Membership'
import type { Org } from '../entities/Org'
import type { User } from '../entities/User'
import type { Workspace } from '../entities/Workspace'
import type { Repositories } from '../ports/Repositories'
import type { OrgId, WorkspaceId } from '../values/Ids'
import { parseName } from '../values/Name'
import { parseSlug, type Slug } from '../values/Slug'

export interface CompanyOrgSetup {
  name: string
  slug: string
  previousSlugs?: string[]
  members?: [User, OrgRole][]
  /** Workspace slugs, created oldest first. */
  workspaces?: string[]
}

/** Writes a company org straight to the repositories, as a platform admin would have made it. */
export async function companyOrg(repositories: Repositories, setup: CompanyOrgSetup): Promise<{ org: Org, workspaces: Workspace[] }> {
  const org: Org = {
    id: `org-${setup.slug}` as OrgId,
    name: parseName(setup.name),
    slug: parseSlug(setup.slug),
    previousSlugs: (setup.previousSlugs ?? []).map(slug => parseSlug(slug)) as Slug[],
    isPersonal: false
  }
  const workspaces = (setup.workspaces ?? ['general']).map((slug, index): Workspace => ({
    id: `ws-${setup.slug}-${slug}` as WorkspaceId,
    orgId: org.id,
    name: parseName(slug),
    slug: parseSlug(slug),
    createdAt: new Date(Date.UTC(2026, 0, index + 1))
  }))
  await repositories.transaction(async (tx) => {
    await tx.orgs.create(org)
    for (const [user, role] of setup.members ?? []) {
      await tx.memberships.add({ orgId: org.id, userId: user.id, role })
    }
    for (const workspace of workspaces) {
      await tx.workspaces.create(workspace)
    }
  })
  return { org, workspaces }
}
