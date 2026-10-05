import { createCoreServices, type CoreServices, type CurrentUser } from '@kmjbyrne/core'
import type { Adapters, AppServices, CoreAdapters, Services } from '../../types'

export interface ServiceContext {
  adapters: Adapters
  core: CoreServices
  currentUser: CurrentUser
}

export type ServiceFactory = (context: ServiceContext) => Partial<AppServices>

/**
 * Where services are built and given their adapters, by plain constructor
 * injection. Adapters come from whoever provided them, else from the
 * defaults, built once on first use. Services are built per request, because
 * they act as that request's user.
 */
export class Container {
  private provided: Partial<Adapters> = {}
  private defaults?: Partial<CoreAdapters>
  private readonly factories: ServiceFactory[] = []

  constructor(private readonly createDefaults: () => Partial<CoreAdapters>) {}

  /** Supplies adapters in place of the defaults, such as the sandbox's stores. */
  provideAdapters(adapters: Partial<Adapters>): void {
    this.provided = { ...this.provided, ...adapters }
  }

  /** Adds an app's own services, built for each request after the core ones. */
  registerServices(factory: ServiceFactory): void {
    this.factories.push(factory)
  }

  adapters(): Adapters {
    this.defaults ??= this.createDefaults()
    return { ...this.defaults, ...this.provided } as Adapters
  }

  services(currentUser: CurrentUser): Services {
    const adapters = this.adapters()
    const core = createCoreServices({ repositories: adapters.repositories, currentUser, ids: adapters.ids, linkProof: adapters.linkProof })
    const services: Services = { ...core } as Services
    for (const factory of this.factories) {
      Object.assign(services, factory({ adapters, core, currentUser }))
    }
    return services
  }
}

/** Stands in for an adapter nobody supplied, and says how to fix it on first use. */
export function missingAdapter<T extends object>(message: string): T {
  return new Proxy({} as T, {
    get(_, property) {
      if (property === 'then') {
        return undefined
      }
      throw new Error(message)
    }
  })
}
