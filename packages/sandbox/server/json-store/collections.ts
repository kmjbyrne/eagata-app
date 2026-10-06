import { defineCollections, type DocumentsOf } from '@kmjbyrne/json-store'
import { defaultTenancyFixtures, type TenancyFixtures } from './fixtures'
import { invitationRecord, membershipRecord, orgFeatureRecord, orgRecord, userRecord, workspaceMemberRecord, workspaceRecord } from './records'

/**
 * The tenancy collections, seeded from fixtures: the defaults, or an app's
 * own. Combine them with an app's collections using `combineCollections`.
 */
export function tenancyCollections(fixtures: TenancyFixtures = defaultTenancyFixtures()) {
  return defineCollections({
    users: { schema: userRecord, seed: () => fixtures.users },
    orgs: { schema: orgRecord, seed: () => fixtures.orgs },
    workspaces: { schema: workspaceRecord, seed: () => fixtures.workspaces },
    memberships: { schema: membershipRecord, seed: () => fixtures.memberships },
    workspaceMembers: { schema: workspaceMemberRecord, seed: () => fixtures.workspaceMembers },
    invitations: { schema: invitationRecord, seed: () => [] },
    orgFeatures: { schema: orgFeatureRecord, seed: () => [] }
  })
}

export type TenancyCollections = ReturnType<typeof tenancyCollections>
export type TenancyDocuments = DocumentsOf<TenancyCollections>
