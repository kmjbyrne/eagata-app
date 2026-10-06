import { NotFoundError } from '../errors'
import type { Repositories } from '../ports/Repositories'
import type { OrgId } from '../values/Ids'
import { parseSlugOrNotFound } from './access'

/**
 * Which flagged features an org has. Every flag is off until a platform
 * admin switches it on for an org. The catalog is every flag the app knows,
 * declared by the layers that own the features: a switched-on row for a name
 * outside it is ignored, so retiring a flag needs no migration.
 */
export class FeatureAccess {
  constructor(
    private readonly repositories: Repositories,
    readonly catalog: readonly string[]
  ) {}

  /** The org's switched-on features, in catalog order. */
  async of(orgId: OrgId, tx: Repositories = this.repositories): Promise<string[]> {
    const on = new Set((await tx.orgFeatures.listByOrg(orgId)).map(row => row.feature))
    return this.catalog.filter(feature => on.has(feature))
  }

  /**
   * The first check of every service method behind a flag, before
   * `workspaceAccess.require`. An org without the feature answers as one
   * that doesn't exist, so a flag's existence isn't revealed.
   * @throws NotFoundError for an unknown org, or a feature it doesn't have
   */
  async require(orgSlug: string, feature: string): Promise<void> {
    const org = await this.repositories.orgs.findBySlug(parseSlugOrNotFound(orgSlug))
    if (!org || !(await this.of(org.id)).includes(feature)) {
      throw new NotFoundError('Not found')
    }
  }

  /** @throws NotFoundError for a name outside the catalog */
  requireKnown(feature: string): string {
    if (!this.catalog.includes(feature)) {
      throw new NotFoundError('No such feature')
    }
    return feature
  }
}
