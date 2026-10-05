import type { OrgId } from '../values/Ids'
import type { Name } from '../values/Name'
import type { Slug } from '../values/Slug'

export interface Org {
  id: OrgId
  name: Name
  slug: Slug
  /** Slugs the org used before, so old links keep leading here. Never reused by another org. */
  previousSlugs: Slug[]
}

/** Every slug that leads to the org, current first. */
export const orgSlugs = (org: Org): Slug[] => [org.slug, ...org.previousSlugs]

/** The old slug keeps redirecting. Moving back to an old slug takes it off the list. */
export function changeOrgSlug(org: Org, slug: Slug): Org {
  if (slug === org.slug) {
    return org
  }
  return {
    ...org,
    slug,
    previousSlugs: [...org.previousSlugs.filter(previous => previous !== slug), org.slug]
  }
}
