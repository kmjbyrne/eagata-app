export { ensureOwnerRemains, InvalidOrgRoleError, ORG_ROLES, parseOrgRole } from './entities/Membership'
export type { Membership, OrgRole } from './entities/Membership'
export { changeOrgSlug, orgSlugs } from './entities/Org'
export type { Org } from './entities/Org'
export { hasSignedIn, isActive } from './entities/User'
export { isPlatformAdmin, PLATFORM_ROLES } from './entities/User'
export type { LinkedIdentity, PlatformRole, PlatformRoleGrant, ProviderIdentity, User, UserIdentity } from './entities/User'
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
export type { WorkspaceInvitation } from './entities/WorkspaceInvitation'
export type { Workspace } from './entities/Workspace'
export {
  AccountDeactivatedError,
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
  NotInvitedError,
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
export type { EmailMessage, EmailSender } from './ports/EmailSender'
export type { IdGenerator } from './ports/IdGenerator'
export type { WorkspaceInvitationRepository } from './ports/WorkspaceInvitationRepository'
export { TooManyAttemptsError } from './ports/RateLimiter'
export type { RateLimiter, RateRule } from './ports/RateLimiter'
export type { LinkProof } from './ports/LinkProof'
export type { MembershipRepository } from './ports/MembershipRepository'
export type { OrgRepository } from './ports/OrgRepository'
export type { AuthorizationOptions, AuthorizationRequest, SignInProvider } from './ports/SignInProvider'
export type { Repositories } from './ports/Repositories'
export type { UserRepository } from './ports/UserRepository'
export type { WorkspaceMembershipRepository } from './ports/WorkspaceMembershipRepository'
export type { WorkspaceRepository } from './ports/WorkspaceRepository'
export { definePermissions, orgPermissions, workspacePermissions } from './entities/permissions'
export type { OrgPermission, Permissions, WorkspacePermission } from './entities/permissions'
export { AuthService } from './services/AuthService'
export type { PendingLink, SignInResult } from './services/AuthService'
export { createCoreServices } from './services/CoreServices'
export type { CoreAdapters, CoreServices } from './services/CoreServices'
export type { AccessibleOrg, AccessibleWorkspace } from './services/access'
export { OrgService } from './services/OrgService'
export { UserService } from './services/UserService'
export { WorkspaceAccess } from './services/WorkspaceAccess'
export type { WorkspaceGrant, WorkspacePermissions } from './services/WorkspaceAccess'
export { WorkspaceService } from './services/WorkspaceService'
export type { WorkspaceMember } from './services/WorkspaceService'
export { PlatformOrgService } from './services/PlatformOrgService'
export type { PlatformOrgDetail, PlatformOrgMember, PlatformOrgSummary } from './services/PlatformOrgService'
export { PlatformUserService } from './services/PlatformUserService'
export type { PlatformUserDetail } from './services/PlatformUserService'
export { acceptInvitations } from './services/acceptInvitations'
export { bootstrapPlatformAdmin } from './services/bootstrapPlatformAdmin'
