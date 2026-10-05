import { describe, expect, it } from 'vitest'
import type { OrgId } from '../values/Ids'
import type { Name } from '../values/Name'
import type { Slug } from '../values/Slug'
import { changeOrgSlug, orgSlugs, type Org } from './Org'

const org = (slug: string, previousSlugs: string[] = []): Org =>
  ({ id: 'o1' as OrgId, name: 'Acme' as Name, slug: slug as Slug, previousSlugs: previousSlugs as Slug[] })

describe('changeOrgSlug', () => {
  it('moves the old slug to the previous slugs', () => {
    expect(changeOrgSlug(org('acme'), 'acme-co' as Slug)).toMatchObject({ slug: 'acme-co', previousSlugs: ['acme'] })
  })

  it('takes a slug off the previous slugs when moving back to it', () => {
    expect(changeOrgSlug(org('acme-co', ['acme']), 'acme' as Slug)).toMatchObject({ slug: 'acme', previousSlugs: ['acme-co'] })
  })

  it('changes nothing for the current slug', () => {
    const current = org('acme', ['old'])
    expect(changeOrgSlug(current, 'acme' as Slug)).toBe(current)
  })
})

describe('orgSlugs', () => {
  it('lists the current slug first', () => {
    expect(orgSlugs(org('acme', ['old', 'older']))).toEqual(['acme', 'old', 'older'])
  })
})
