import { OidcSignInProvider } from '@kmjbyrne/nuxt-shell/adapters'
import { FakeOidcClient } from '@kmjbyrne/sandbox/oidc'
import { combineCollections } from '@kmjbyrne/json-store'
import { JsonPasswordRepository, JsonStoreRepositories, passwordCollections, tenancyCollections, tenancyDevUsers } from '@kmjbyrne/sandbox/json-store'

// The dev data and sign-in stand-in, handed to the app's container in place
// of the database and the real provider.
export default defineNitroPlugin(() => {
  const { dataStore, signIn, oidc } = useRuntimeConfig()
  if (dataStore !== 'json' && dataStore !== 'mysql') {
    throw new Error(`NUXT_DATA_STORE must be json or mysql, got "${dataStore}"`)
  }
  if (signIn && signIn !== 'sandbox' && signIn !== 'provider') {
    throw new Error(`NUXT_SIGN_IN must be sandbox or provider, got "${signIn}"`)
  }
  if (signIn === 'provider' && !oidc.clientId) {
    throw new Error('NUXT_SIGN_IN=provider needs NUXT_OIDC_CLIENT_ID and NUXT_OIDC_CLIENT_SECRET')
  }

  const standInSignIn = signIn ? signIn === 'sandbox' : !oidc.clientId
  const sandbox = defineSandbox({
    collections: combineCollections(tenancyCollections(), passwordCollections()),
    devUsers: tenancyDevUsers,
    signIn: standInSignIn,
    data: dataStore === 'json'
  })
  if (dataStore === 'json') {
    provideAdapters({ repositories: new JsonStoreRepositories(sandbox.store), passwordRepository: new JsonPasswordRepository(sandbox.store) })
  }
  if (standInSignIn) {
    provideAdapters({ signIn: new OidcSignInProvider(useRuntimeConfig().public.signInProvider, new FakeOidcClient()) })
  }
})
