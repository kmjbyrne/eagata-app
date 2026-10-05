import { hasSignedIn, type Org, type PlatformOrgDetail, type User } from '@kmjbyrne/core'
import type { PlatformOrg, PlatformOrgDetailResponse, PlatformUserSummary } from '../../shared/contracts/platform'

export const toPlatformOrg = (org: Org): PlatformOrg =>
  ({ id: org.id, name: org.name, slug: org.slug, isPersonal: org.isPersonal, previousSlugs: org.previousSlugs })

export const toPlatformUser = (user: User): PlatformUserSummary => ({
  id: user.id,
  displayName: user.displayName,
  email: user.email,
  avatarUrl: user.avatarUrl,
  isPlatformAdmin: user.isPlatformAdmin,
  hasSignedIn: hasSignedIn(user),
  deactivatedAt: user.deactivatedAt?.toISOString() ?? null
})

export const toPlatformOrgDetail = (detail: PlatformOrgDetail): PlatformOrgDetailResponse => ({
  org: toPlatformOrg(detail.org),
  members: detail.members.map(member => ({ user: toPlatformUser(member.user), role: member.role })),
  workspaces: detail.workspaces.map(workspace => ({ id: workspace.id, name: workspace.name, slug: workspace.slug }))
})
