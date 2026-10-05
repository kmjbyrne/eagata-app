export type { ProviderIdentity, User, UserIdentity } from './entities/User'
export { hasSignedIn } from './entities/User'
export { DomainError, ForbiddenError, InvalidInputError, NotFoundError, NotSignedInError } from './errors'
export { EMAIL_MAX_LENGTH, InvalidEmailError, parseEmail } from './values/Email'
export type { Email } from './values/Email'
export { parseOrgId, parseUserId, parseWorkspaceId } from './values/Ids'
export type { OrgId, UserId, WorkspaceId } from './values/Ids'
export { InvalidNameError, NAME_MAX_LENGTH, parseName } from './values/Name'
export type { Name } from './values/Name'
export {
  InvalidSlugError,
  parseOrgSlug,
  parseSlug,
  RESERVED_ORG_SLUGS,
  ReservedSlugError,
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  suggestSlug
} from './values/Slug'
export type { Slug } from './values/Slug'
