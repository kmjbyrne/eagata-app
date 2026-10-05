import type { Workspace } from '../entities/Workspace'
import type { OrgId, WorkspaceId } from '../values/Ids'
import type { Slug } from '../values/Slug'

export interface WorkspaceRepository {
  findById(id: WorkspaceId): Promise<Workspace | null>
  findBySlug(orgId: OrgId, slug: Slug): Promise<Workspace | null>
  /** Oldest first. */
  listByOrg(orgId: OrgId): Promise<Workspace[]>
  /** @throws SlugTakenError if the org has a workspace with its slug */
  create(workspace: Workspace): Promise<void>
}
