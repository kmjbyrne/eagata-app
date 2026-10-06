import type { OrgId, UserId } from '../values/Ids'

/**
 * A feature switched on for one org. Every flagged feature is off until a
 * platform admin switches it on, so an org has no row for a feature it lacks.
 * The feature is a name from the app's catalog of flags, such as
 * `progressBoard`: rows for a name the catalog no longer has are ignored.
 */
export interface OrgFeature {
  orgId: OrgId
  feature: string
  enabledAt: Date
  /** Null when switched on outside the app, such as by dev data. */
  enabledBy: UserId | null
}
