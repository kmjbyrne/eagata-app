import type { User } from '../entities/User'
import { ForbiddenError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { TenancyRepositories } from '../ports/TenancyStore'
import { requireUser } from './access'

/**
 * Every platform operation starts here. Routes may check first, for an early
 * answer, but the services never rely on that.
 * @throws NotSignedInError
 * @throws ForbiddenError
 */
export async function requirePlatformAdmin(repositories: TenancyRepositories, currentUser: CurrentUser): Promise<User> {
  const user = await requireUser(repositories, currentUser)
  if (!user.isPlatformAdmin) {
    throw new ForbiddenError('Platform admins only')
  }
  return user
}
