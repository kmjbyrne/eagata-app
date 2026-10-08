import type { Email } from '../values/Email'
import type { UserId } from '../values/Ids'
import type { Name } from '../values/Name'

/** An account at an identity provider, keyed by the provider's stable subject, never by email. */
export interface UserIdentity {
  /** The configured provider name, such as "google". */
  provider: string
  subject: string
}

/** A provider account linked to a user, and when it was linked. */
export interface LinkedIdentity extends UserIdentity {
  linkedAt: Date
}

/** What a provider asserted about the person who just signed in with it. */
export interface ProviderIdentity extends UserIdentity {
  email: Email
  emailVerified: boolean
  name: string | null
  picture: string | null
}

export const PLATFORM_ROLES = ['admin'] as const

/** The platform role: runs the platform itself, and belongs to no org because of it. */
export type PlatformRole = typeof PLATFORM_ROLES[number]

/** A platform role, who granted it and when. `grantedBy` is null when granted from the command line. */
export interface PlatformRoleGrant {
  role: PlatformRole
  grantedAt: Date
  grantedBy: UserId | null
}

export interface User {
  id: UserId
  displayName: Name
  email: Email
  /** From the last sign-in, when the provider sent a picture. */
  avatarUrl: string | null
  /** Most users have none. Saved through `setPlatformRole`, never `update`. */
  platformRole: PlatformRoleGrant | null
  /** Empty until the user first signs in. */
  identities: LinkedIdentity[]
  /**
   * Set by a platform admin. A deactivated user can't sign in, and their
   * sessions end, but nothing of theirs is removed: reactivating restores it.
   */
  deactivatedAt: Date | null
  /**
   * Sealed into each session when it starts. A session with an older version
   * is signed out, so moving it on ends every session the user has. Saved
   * through `bumpSessionVersion`, never `update`.
   */
  sessionVersion: number
}

export const hasSignedIn = (user: User) => user.identities.length > 0

export const isActive = (user: User) => user.deactivatedAt === null

export const isPlatformAdmin = (user: User) => user.platformRole?.role === 'admin'
