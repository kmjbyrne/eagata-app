import { InvalidInputError, LastOwnerError } from '../errors'
import type { OrgId, UserId } from '../values/Ids'

/** Org roles, separate from the platform role on `User`. Least to most privileged. */
export const ORG_ROLES = ['member', 'admin', 'owner'] as const

export type OrgRole = typeof ORG_ROLES[number]

/** A user's place in one org. At most one per user per org. */
export interface Membership {
  userId: UserId
  orgId: OrgId
  role: OrgRole
}

export class InvalidOrgRoleError extends InvalidInputError {
  constructor(readonly input: string) {
    super(`An org role is one of ${ORG_ROLES.join(', ')}. Got "${input}"`)
  }
}

export function parseOrgRole(input: string): OrgRole {
  if (!(ORG_ROLES as readonly string[]).includes(input)) {
    throw new InvalidOrgRoleError(input)
  }
  return input as OrgRole
}

/** Owners and admins run the org day to day. */
export const canManageWorkspaces = (role: OrgRole) => role === 'owner' || role === 'admin'

/**
 * Checks that an org still has an owner after a member's role changes, or
 * after they leave (`role` null).
 * @throws LastOwnerError
 */
export function ensureOwnerRemains(memberships: Membership[], userId: UserId, role: OrgRole | null): void {
  const owners = memberships.filter(membership =>
    membership.userId === userId ? role === 'owner' : membership.role === 'owner'
  )
  if (!owners.length) {
    throw new LastOwnerError('organization')
  }
}
