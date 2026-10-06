import type { OrgFeature } from '../entities/OrgFeature'
import type { OrgId } from '../values/Ids'

export interface OrgFeatureRepository {
  /** By feature name. */
  listByOrg(orgId: OrgId): Promise<OrgFeature[]>
  /** Adds the row, or keeps the one already there, with its original time and person. */
  enable(feature: OrgFeature): Promise<void>
  disable(orgId: OrgId, feature: string): Promise<void>
}
