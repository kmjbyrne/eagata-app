import type { Workspace } from '../entities/Workspace'
import type { OrgId } from '../values/Ids'
import type { Slug } from '../values/Slug'

export interface WorkspaceRepository {
  findBySlug(orgId: OrgId, slug: Slug): Promise<Workspace | null>
  /** Oldest first. */
  listByOrg(orgId: OrgId): Promise<Workspace[]>
  /** @throws SlugTakenError if the org has a workspace with its slug */
  create(workspace: Workspace): Promise<void>
}
