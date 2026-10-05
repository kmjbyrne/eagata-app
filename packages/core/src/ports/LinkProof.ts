import type { UserId } from '../values/Ids'

/**
 * Whether linking a provider account to an existing user needs proof beyond
 * the provider's verified email, such as the user's password. Without one,
 * a verified email is enough.
 */
export interface LinkProof {
  requiredFor(userId: UserId): Promise<boolean>
}
