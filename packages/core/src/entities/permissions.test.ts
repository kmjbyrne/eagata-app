import { describe, expect, it } from 'vitest'
import { definePermissions, orgPermissions, workspacePermissions } from './permissions'

describe('definePermissions', () => {
  const permissions = definePermissions(['low', 'mid', 'high'] as const, { read: 'low', write: 'mid', admin: 'high' })

  it('gives a role every permission of the roles before it', () => {
    expect(permissions.of('low')).toEqual(['read'])
    expect(permissions.of('mid')).toEqual(['read', 'write'])
    expect(permissions.of('high')).toEqual(['read', 'write', 'admin'])
    expect(permissions.can('mid', 'admin')).toBe(false)
  })

  it('extends with more permissions, leaving the original as it was', () => {
    const more = permissions.extend({ publish: 'high' })

    expect(more.can('high', 'publish')).toBe(true)
    expect(more.can('mid', 'publish')).toBe(false)
    expect(permissions.of('high')).toEqual(['read', 'write', 'admin'])
  })
})

describe('the foundation\'s permissions', () => {
  it('lets only workspace owners manage members', () => {
    expect(workspacePermissions.of('viewer')).toEqual(['workspace.view', 'members.view'])
    expect(workspacePermissions.of('owner')).toContain('members.manage')
  })

  it('lets org owners and admins create workspaces', () => {
    expect(orgPermissions.of('member')).toEqual(['org.view'])
    expect(orgPermissions.of('admin')).toEqual(['org.view', 'workspaces.create'])
  })
})
