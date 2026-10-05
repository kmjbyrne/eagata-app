import type { UserId } from '../values/Ids'

/** Who is making the request, as the session says. Null when signed out. */
export interface CurrentUser {
  readonly userId: UserId | null
}
