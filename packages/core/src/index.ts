export { canManageWorkspaces, ensureOwnerRemains, InvalidOrgRoleError, ORG_ROLES, parseOrgRole } from './entities/Membership'
export type { Membership, OrgRole } from './entities/Membership'
export { changeOrgSlug, orgSlugs } from './entities/Org'
export type { Org } from './entities/Org'
export { hasSignedIn } from './entities/User'
export type { ProviderIdentity, User, UserIdentity } from './entities/User'
export { DEFAULT_WORKSPACE } from './entities/Workspace'
export {
  effectiveWorkspaceRole,
  ensureWorkspaceOwnerRemains,
  InvalidWorkspaceRoleError,
  parseWorkspaceRole,
  roleAllows,
  WORKSPACE_ROLES
} from './entities/WorkspaceMembership'
export type { WorkspaceMembership, WorkspaceRole } from './entities/WorkspaceMembership'
export type { Workspace } from './entities/Workspace'
export {
  AlreadyMemberError,
  ConflictError,
  DomainError,
  EmailTakenError,
  ForbiddenError,
  IdentityInUseError,
  EmailNotVerifiedError,
  IdentityMismatchError,
  InvalidInputError,
  LastOwnerError,
  LastPlatformAdminError,
  NotFoundError,
  NotSignedInError,
  SlugTakenError
} from './errors'
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
export type { CurrentUser } from './ports/CurrentUser'
export type { IdGenerator } from './ports/IdGenerator'
export type { MembershipRepository } from './ports/MembershipRepository'
export type { OrgRepository } from './ports/OrgRepository'
export type { AuthorizationOptions, AuthorizationRequest, SignInProvider } from './ports/SignInProvider'
export type { TenancyRepositories, TenancyStore } from './ports/TenancyStore'
export type { UserRepository } from './ports/UserRepository'
export type { WorkspaceMembershipRepository } from './ports/WorkspaceMembershipRepository'
export type { WorkspaceRepository } from './ports/WorkspaceRepository'
export { AuthService } from './services/AuthService'
export { createCoreServices } from './services/CoreServices'
export type { CoreAdapters, CoreServices } from './services/CoreServices'
