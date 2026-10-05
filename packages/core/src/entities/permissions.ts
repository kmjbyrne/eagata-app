import { ORG_ROLES } from './Membership'
import { WORKSPACE_ROLES } from './WorkspaceMembership'

/** Which role each permission needs, and how to ask. */
export interface Permissions<R extends string, P extends string> {
  /** Permission to the least role that holds it. */
  readonly map: Readonly<Record<P, R>>
  can(role: R, permission: P): boolean
  /** Every permission the role holds, in the order they were defined. */
  of(role: R): P[]
  /** The same roles, with more permissions, such as an app's own. */
  extend<const Q extends string>(more: Record<Q, R>): Permissions<R, P | Q>
}

/**
 * The one place that decides what each role may do. Roles are ordered least
 * to most privileged, and a role holds every permission of the roles before
 * it. Code asks for a permission, never a role, so a role's powers change here
 * alone.
 */
export function definePermissions<R extends string, const P extends string>(roles: readonly R[], map: Record<P, R>): Permissions<R, P> {
  const rank = (role: R) => roles.indexOf(role)
  const can = (role: R, permission: P) => rank(role) >= rank(map[permission])
  return {
    map,
    can,
    of: role => (Object.keys(map) as P[]).filter(permission => can(role, permission)),
    extend: more => definePermissions<R, P | (keyof typeof more & string)>(roles, { ...map, ...more })
  }
}

export const workspacePermissions = definePermissions(WORKSPACE_ROLES, {
  'workspace.view': 'viewer',
  'members.view': 'viewer',
  'members.manage': 'owner',
  // Viewers too, so anyone in the workspace can attach a screenshot to feedback.
  'media.upload': 'viewer'
})

export type WorkspacePermission = keyof typeof workspacePermissions.map

export const orgPermissions = definePermissions(ORG_ROLES, {
  'org.view': 'member',
  'workspaces.create': 'admin'
})

export type OrgPermission = keyof typeof orgPermissions.map
