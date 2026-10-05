import { createDatabase, type Database } from '../adapters/mysql/MysqlRepositories'

let database: Database | undefined

/**
 * The app's one connection pool, from NUXT_DATABASE_URL. An app's own
 * repositories use it too, so they share connections, and can join the
 * shell's tables.
 */
export function useDatabase(): Database {
  const { databaseUrl } = useRuntimeConfig()
  if (!databaseUrl) {
    throw new Error('NUXT_DATABASE_URL is not set')
  }
  database ??= createDatabase(databaseUrl)
  return database
}
