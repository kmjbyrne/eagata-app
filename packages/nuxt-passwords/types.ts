import type { PasswordHasher, PasswordRepository, PasswordService } from '@kmjbyrne/core/passwords'

declare module '@kmjbyrne/nuxt-shell/types' {
  interface AppAdapters {
    /** Defaults to MariaDB when NUXT_DATABASE_URL is set. The sandbox supplies its own. */
    passwordRepository?: PasswordRepository
    /** Defaults to Werkzeug's pbkdf2 format. */
    passwordHasher?: PasswordHasher
  }

  interface AppServices {
    passwords: PasswordService
  }
}

export {}
