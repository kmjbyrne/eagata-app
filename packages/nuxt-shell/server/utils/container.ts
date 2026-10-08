import type { Repositories, SignInProvider } from '@kmjbyrne/core'
import { OIDC_PRESETS, OidcClient } from '@kmjbyrne/oidc'
import type { H3Event } from 'h3'
import type { Adapters, CoreAdapters, Services } from '../../types'
import { MysqlRepositories } from '../adapters/mysql/MysqlRepositories'
import { InMemoryRateLimiter } from '../adapters/InMemoryRateLimiter'
import { OidcSignInProvider } from '../adapters/OidcSignInProvider'
import { SessionCurrentUser } from '../adapters/SessionCurrentUser'
import { UuidIdGenerator } from '../adapters/UuidIdGenerator'
import { Container, missingAdapter, type ServiceFactory } from '../container/Container'
import { createEmailSender } from '../container/createEmailSender'

// The flag catalog is every name under `shell.features` in the merged app
// config, declared by the layers that own the features.
const container = new Container(createDefaultAdapters, () => Object.keys(useAppConfig().shell.features))

function createDefaultAdapters(provided: Partial<Adapters>): Partial<CoreAdapters> {
  const { oidc, databaseUrl, email } = useRuntimeConfig()
  return {
    ids: new UuidIdGenerator(),
    emailSender: provided.emailSender ?? createEmailSender(email, import.meta.dev),
    // One per process, shared by every request. Counts reset on restart.
    rateLimiter: new InMemoryRateLimiter(),
    repositories: databaseUrl
      ? new MysqlRepositories(useDatabase())
      : missingAdapter<Repositories>('No data store is configured. Run `pnpm dev` for the sandbox, or set NUXT_DATABASE_URL'),
    signIn: createSignInProvider(oidc)
  }
}

/** A provider with a preset needs only its client id and secret. Explicit settings win. */
function createSignInProvider(oidc: ReturnType<typeof useRuntimeConfig>['oidc']): SignInProvider {
  const provider = useRuntimeConfig().public.signInProvider
  const preset = OIDC_PRESETS[provider]
  const issuer = oidc.issuer || preset?.issuer
  if (!issuer) {
    return missingAdapter(`No issuer for the OIDC provider "${provider}". Set NUXT_OIDC_ISSUER, or use a provider with a preset: ${Object.keys(OIDC_PRESETS).join(', ')}`)
  }
  const aliases = oidc.issuerAliases ? oidc.issuerAliases.split(',').map(alias => alias.trim()).filter(Boolean) : preset?.issuerAliases
  return new OidcSignInProvider(provider, new OidcClient({
    issuer,
    issuerAliases: aliases,
    clientId: oidc.clientId,
    clientSecret: oidc.clientSecret,
    redirectUri: oidc.redirectUri || undefined
  }))
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

/**
 * Stands in for an adapter that can't be built, such as a repository with no
 * NUXT_DATABASE_URL, and says how to fix it only when used. A layer's
 * services can then be built for every request without failing the ones that
 * never touch it.
 */
export { missingAdapter }

export function useAdapters(): Adapters {
  return container.adapters()
}

/** Every service, acting as the request's signed-in user. */
export function useServices(event: H3Event): Services {
  return container.services(new SessionCurrentUser(event))
}
