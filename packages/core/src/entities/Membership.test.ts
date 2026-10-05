import { describe, expect, it } from 'vitest'
import { LastOwnerError } from '../errors'
import type { OrgId, UserId } from '../values/Ids'
import { canManageWorkspaces, ensureOwnerRemains, InvalidOrgRoleError, parseOrgRole, type Membership, type OrgRole } from './Membership'

const member = (userId: string, role: OrgRole): Membership => ({ userId: userId as UserId, orgId: 'o1' as OrgId, role })
const ada = 'ada' as UserId

describe('parseOrgRole', () => {
  it.each(['owner', 'admin', 'member'])('accepts %s', (role) => {
    expect(parseOrgRole(role)).toBe(role)
  })

  it.each(['', 'Owner', 'editor'])('rejects "%s"', (role) => {
    expect(() => parseOrgRole(role)).toThrow(InvalidOrgRoleError)
  })
})

describe('canManageWorkspaces', () => {
  it.each([['owner', true], ['admin', true], ['member', false]] as const)('%s: %s', (role, expected) => {
    expect(canManageWorkspaces(role)).toBe(expected)
  })
})

describe('ensureOwnerRemains', () => {
  const soleOwner = [member('ada', 'owner'), member('grace', 'admin')]
  const twoOwners = [member('ada', 'owner'), member('grace', 'owner')]

  it('refuses to demote or remove the last owner', () => {
    expect(() => ensureOwnerRemains(soleOwner, ada, 'admin')).toThrow(LastOwnerError)
    expect(() => ensureOwnerRemains(soleOwner, ada, null)).toThrow(LastOwnerError)
  })

  it('allows it when another owner remains', () => {
    expect(() => ensureOwnerRemains(twoOwners, ada, 'member')).not.toThrow()
    expect(() => ensureOwnerRemains(twoOwners, ada, null)).not.toThrow()
  })

  it('allows changes to non-owners even with no owner at all', () => {
    expect(() => ensureOwnerRemains([member('grace', 'member')], 'grace' as UserId, 'admin')).not.toThrow()
  })

  it('allows changes to other members', () => {
    expect(() => ensureOwnerRemains(soleOwner, 'grace' as UserId, null)).not.toThrow()
  })
})
