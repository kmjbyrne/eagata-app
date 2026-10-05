import { OidcSignInProvider } from '@kmjbyrne/nuxt-shell/adapters'
import { FakeOidcClient } from '@kmjbyrne/sandbox/oidc'
import { JsonStoreRepositories, tenancyCollections, tenancyDevUsers } from '@kmjbyrne/sandbox/json-store'

// The dev data and sign-in stand-in, handed to the app's container in place
// of the database and the real provider.
export default defineNitroPlugin(() => {
  const { dataStore, oidc } = useRuntimeConfig()
  if (dataStore !== 'json' && dataStore !== 'mysql') {
    throw new Error(`NUXT_DATA_STORE must be json or mysql, got "${dataStore}"`)
  }

  const sandbox = defineSandbox({ collections: tenancyCollections(), devUsers: tenancyDevUsers })
  if (dataStore === 'json') {
    provideAdapters({ repositories: new JsonStoreRepositories(sandbox.store) })
  }
  // With a real client configured, sign-in goes to the real provider.
  if (!oidc.clientId) {
    provideAdapters({ signIn: new OidcSignInProvider(oidc.provider, new FakeOidcClient()) })
  }
})
