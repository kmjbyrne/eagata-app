import { describe, expect, it } from 'vitest'
import { LastOwnerError } from '../errors'
import type { UserId, WorkspaceId } from '../values/Ids'
import {
  effectiveWorkspaceRole,
  ensureWorkspaceOwnerRemains,
  InvalidWorkspaceRoleError,
  parseWorkspaceRole,
  roleAllows,
  type WorkspaceMembership,
  type WorkspaceRole
} from './WorkspaceMembership'

const member = (userId: string, role: WorkspaceRole): WorkspaceMembership =>
  ({ userId: userId as UserId, workspaceId: 'w1' as WorkspaceId, role })

describe('parseWorkspaceRole', () => {
  it.each(['owner', 'editor', 'viewer'])('accepts %s', (role) => {
    expect(parseWorkspaceRole(role)).toBe(role)
  })

  it.each(['', 'admin', 'member'])('rejects "%s"', (role) => {
    expect(() => parseWorkspaceRole(role)).toThrow(InvalidWorkspaceRoleError)
  })
})

describe('roleAllows', () => {
  it.each([
    ['owner', 'editor', true],
    ['editor', 'editor', true],
    ['editor', 'owner', false],
    ['viewer', 'editor', false],
    ['viewer', 'viewer', true]
  ] as const)('%s may act as %s: %s', (held, required, expected) => {
    expect(roleAllows(held, required)).toBe(expected)
  })
})

describe('effectiveWorkspaceRole', () => {
  it('makes org owners and admins workspace owners without a membership', () => {
    expect(effectiveWorkspaceRole('owner', null)).toBe('owner')
    expect(effectiveWorkspaceRole('admin', member('ada', 'viewer'))).toBe('owner')
  })

  it('gives plain org members and outsiders their membership role, or nothing', () => {
    expect(effectiveWorkspaceRole('member', member('ada', 'editor'))).toBe('editor')
    expect(effectiveWorkspaceRole(null, member('ada', 'viewer'))).toBe('viewer')
    expect(effectiveWorkspaceRole('member', null)).toBeNull()
    expect(effectiveWorkspaceRole(null, null)).toBeNull()
  })
})

describe('ensureWorkspaceOwnerRemains', () => {
  const soleOwner = [member('ada', 'owner'), member('grace', 'editor')]

  it('refuses to demote or remove the last owner', () => {
    expect(() => ensureWorkspaceOwnerRemains(soleOwner, 'ada' as UserId, 'editor')).toThrow(LastOwnerError)
    expect(() => ensureWorkspaceOwnerRemains(soleOwner, 'ada' as UserId, null)).toThrow(LastOwnerError)
  })

  it('allows it when another owner remains, and changes to other members', () => {
    expect(() => ensureWorkspaceOwnerRemains([...soleOwner, member('mary', 'owner')], 'ada' as UserId, null)).not.toThrow()
    expect(() => ensureWorkspaceOwnerRemains(soleOwner, 'grace' as UserId, null)).not.toThrow()
  })
})
