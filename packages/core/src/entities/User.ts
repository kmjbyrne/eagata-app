import type { Email } from '../values/Email'
import type { UserId } from '../values/Ids'
import type { Name } from '../values/Name'

/** An account at an identity provider, keyed by the provider's stable subject, never by email. */
export interface UserIdentity {
  /** The configured provider name, such as "google". */
  provider: string
  subject: string
}

/** What a provider asserted about the person who just signed in with it. */
export interface ProviderIdentity extends UserIdentity {
  email: Email
  emailVerified: boolean
  picture: string | null
}

export interface User {
  id: UserId
  displayName: Name
  email: Email
  /** From the last sign-in, when the provider sent a picture. */
  avatarUrl: string | null
  /** Platform role: runs the platform itself, and belongs to no org because of it. */
  isPlatformAdmin: boolean
  /** Empty until the user first signs in. */
  identities: UserIdentity[]
}

export const hasSignedIn = (user: User) => user.identities.length > 0
