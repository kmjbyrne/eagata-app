import type { CoreServices, IdGenerator, Repositories, SignInProvider } from '@kmjbyrne/core'

/**
 * An app's own adapters, such as its repositories. Apps add to it:
 *
 *   declare module '@kmjbyrne/nuxt-shell/types' {
 *     interface AppAdapters { notes: NoteRepository }
 *   }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- extended by apps through declaration merging
export interface AppAdapters {}

/** An app's own services, added to the same way as `AppAdapters`. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- extended by apps through declaration merging
export interface AppServices {}

export interface CoreAdapters {
  repositories: Repositories
  signIn: SignInProvider
  ids: IdGenerator
}

export type Adapters = CoreAdapters & AppAdapters

export type Services = CoreServices & AppServices
