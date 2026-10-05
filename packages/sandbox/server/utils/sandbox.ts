import { FileJsonStore, type CollectionDefinitions, type DocumentsOf, type SeededJsonStore } from '@kmjbyrne/json-store'

/** Someone the sandbox offers to sign in as. */
export interface DevUser {
  id: string
  email: string
  name: string
  /** A short account of who they are, such as their roles. */
  description?: string
  avatar?: string | null
}

export interface SandboxOptions<C extends CollectionDefinitions> {
  collections: C
  /** The people "Sign in as" offers, read from the store each time, so new users appear at once. */
  devUsers: (store: SeededJsonStore<DocumentsOf<C>>) => Promise<DevUser[]>
  /** Defaults to .data/store.json, relative to where the dev server runs. */
  file?: string
  /** Whether the sign-in stand-in is in use. "Sign in as" shows only while it is. Defaults to true. */
  signIn?: boolean
  /** Whether the JSON store holds the app's data. The store status shows only while it does. Defaults to true. */
  data?: boolean
}

export interface Sandbox<C extends CollectionDefinitions> {
  store: SeededJsonStore<DocumentsOf<C>>
  devUsers: () => Promise<DevUser[]>
  signIn: boolean
  data: boolean
}

let current: Sandbox<CollectionDefinitions> | undefined

/**
 * Sets up the sandbox's store from the app's collections. The file is read
 * and seeded on first use, so plugin order doesn't matter. Call it once, from
 * the app's sandbox plugin.
 */
export function defineSandbox<C extends CollectionDefinitions>(options: SandboxOptions<C>): Sandbox<C> {
  const store = new FileJsonStore({ file: options.file ?? '.data/store.json', collections: options.collections })
  const sandbox: Sandbox<C> = { store, devUsers: () => options.devUsers(store), signIn: options.signIn ?? true, data: options.data ?? true }
  current = sandbox as unknown as Sandbox<CollectionDefinitions>
  return sandbox
}

export function useSandbox(): Sandbox<CollectionDefinitions> {
  if (!current) {
    throw new Error('The sandbox is not set up. Call defineSandbox from a Nitro plugin in sandbox/server/plugins.')
  }
  return current
}
