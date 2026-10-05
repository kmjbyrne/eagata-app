import type { SeededJsonStore } from '@kmjbyrne/json-store'
import type { DevUser } from '../utils/sandbox'
import type { TenancyDocuments } from './collections'

/**
 * Everyone in the store, with a short account of their roles, for "Sign in
 * as". Read each time, so users a platform admin creates appear at once.
 */
export async function tenancyDevUsers(store: SeededJsonStore<TenancyDocuments>): Promise<DevUser[]> {
  const [users, orgs, memberships] = await Promise.all([store.find('users'), store.find('orgs'), store.find('memberships')])
  const companies = new Map(orgs.filter(org => !org.isPersonal).map(org => [org.id, org.name]))
  return users
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((user) => {
      const roles = memberships
        .filter(membership => membership.userId === user.id && companies.has(membership.orgId))
        .map(membership => `${membership.role} of ${companies.get(membership.orgId)}`)
      const parts = [...(user.deactivatedAt ? ['Deactivated'] : []), ...(user.platformRole ? ['Platform admin'] : []), ...roles]
      return {
        id: user.id,
        email: user.email,
        name: user.displayName,
        description: parts.length ? parts.join(', ') : 'Personal org only',
        avatar: user.avatarUrl
      }
    })
}
