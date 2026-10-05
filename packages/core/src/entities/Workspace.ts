import type { OrgId, WorkspaceId } from '../values/Ids'
import type { Name } from '../values/Name'
import type { Slug } from '../values/Slug'

export interface Workspace {
  id: WorkspaceId
  orgId: OrgId
  name: Name
  /** Unique within the org. */
  slug: Slug
  /** An org's first workspace is its oldest. */
  createdAt: Date
}

/** The name and slug every new org's first workspace gets. */
export const DEFAULT_WORKSPACE = { name: 'General', slug: 'general' } as const
