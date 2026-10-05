import type { Repositories } from '@kmjbyrne/core'
import { OidcClient } from '@kmjbyrne/oidc'
import type { H3Event } from 'h3'
import type { Adapters, CoreAdapters, Services } from '../../types'
import { OidcSignInProvider } from '../adapters/OidcSignInProvider'
import { SessionCurrentUser } from '../adapters/SessionCurrentUser'
import { UuidIdGenerator } from '../adapters/UuidIdGenerator'
import { Container, missingAdapter, type ServiceFactory } from '../container/Container'

const container = new Container(createDefaultAdapters)

function createDefaultAdapters(): Partial<CoreAdapters> {
  const { oidc } = useRuntimeConfig()
  return {
    ids: new UuidIdGenerator(),
    repositories: missingAdapter<Repositories>('No data store is configured. Run `pnpm dev` for the sandbox, or set NUXT_DATABASE_URL'),
    signIn: new OidcSignInProvider(oidc.provider, new OidcClient({
      issuer: oidc.issuer,
      issuerAliases: oidc.issuerAliases.split(',').map(alias => alias.trim()).filter(Boolean),
      clientId: oidc.clientId,
      clientSecret: oidc.clientSecret,
      redirectUri: oidc.redirectUri
    }))
  }
}

/**
 * Supplies adapters in place of the defaults, from a Nitro plugin. The
 * sandbox provides its stores and sign-in stand-in this way.
 */
export function provideAdapters(adapters: Partial<Adapters>): void {
  container.provideAdapters(adapters)
}

/**
 * Adds an app's own services, from a Nitro plugin in the app's
 * `server/plugins/`. Type them by extending `AppServices`.
 */
export function registerServices(factory: ServiceFactory): void {
  container.registerServices(factory)
}

export function useAdapters(): Adapters {
  return container.adapters()
}

/** Every service, acting as the request's signed-in user. */
export function useServices(event: H3Event): Services {
  return container.services(new SessionCurrentUser(event))
}
