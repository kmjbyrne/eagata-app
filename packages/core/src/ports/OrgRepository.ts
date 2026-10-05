import type { Org } from '../entities/Org'
import type { OrgId } from '../values/Ids'
import type { Slug } from '../values/Slug'

export interface OrgRepository {
  findById(id: OrgId): Promise<Org | null>
  /** Current slugs only. */
  findBySlug(slug: Slug): Promise<Org | null>
  /** Current or previous slugs. */
  findBySlugOrPrevious(slug: Slug): Promise<Org | null>
  /** By name. */
  list(): Promise<Org[]>
  /** @throws SlugTakenError if any of its slugs is another org's current or previous slug */
  create(org: Org): Promise<void>
  /** @throws SlugTakenError as for `create` */
  update(org: Org): Promise<void>
}
