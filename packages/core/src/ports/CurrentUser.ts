import type { UserId } from '../values/Ids'

/** Who is making the request, as the session says. Null when signed out. */
export interface CurrentUser {
  readonly userId: UserId | null
  /** The user's session version when the session started. */
  readonly sessionVersion: number
}
