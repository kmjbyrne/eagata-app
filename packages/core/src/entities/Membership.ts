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
 * Checks that changing a member's role, or removing them (`role` null),
 * doesn't take away an org's last owner. Changes to anyone who isn't an owner
 * pass.
 * @throws LastOwnerError
 */
export function ensureOwnerRemains(memberships: Membership[], userId: UserId, role: OrgRole | null): void {
  if (!memberships.some(membership => membership.userId === userId && membership.role === 'owner')) {
    return
  }
  const owners = memberships.filter(membership =>
    membership.userId === userId ? role === 'owner' : membership.role === 'owner'
  )
  if (!owners.length) {
    throw new LastOwnerError('organization')
  }
}
