import { hostname } from 'node:os'
import { ForbiddenError, isPlatformAdmin } from '@kmjbyrne/core'
import { sql } from 'drizzle-orm'
import type { ApplicationResponse } from '../../../shared/contracts/platform'

type Database = ApplicationResponse['database']

/** Compares the database's last applied migration with the ones this build ships. */
async function databaseState(migrations: { tag: string, when: number }[]): Promise<Database> {
  const latest = migrations.at(-1)?.tag ?? null
  if (!useRuntimeConfig().databaseUrl) {
    return { status: 'none', applied: null, latest, pending: 0 }
  }
  try {
    const [rows] = await useDatabase().execute(sql`SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1`) as unknown as [{ created_at: number | string }[]]
    const when = Number(rows[0]?.created_at)
    const index = migrations.findIndex(migration => migration.when === when)
    if (index === -1) {
      const ahead = migrations.length > 0 && when > migrations.at(-1)!.when
      return { status: ahead ? 'ahead' : 'unknown', applied: null, latest, pending: 0 }
    }
    const pending = migrations.length - 1 - index
    return { status: pending ? 'behind' : 'current', applied: migrations[index]!.tag, latest, pending }
  } catch {
    return { status: 'unknown', applied: null, latest, pending: 0 }
  }
}

/** Which build is answering, and whether its database is migrated. Platform admins only. */
export default defineServiceHandler(async (event): Promise<ApplicationResponse> => {
  if (!isPlatformAdmin(await useServices(event).users.getMe())) {
    throw new ForbiddenError('Platform admins only')
  }
  const { release, deploymentSlot } = useRuntimeConfig()
  return {
    version: release.version,
    commit: release.commit,
    commitDate: release.commitDate || null,
    builtAt: release.builtAt,
    platform: release.platform,
    slot: deploymentSlot || null,
    host: hostname(),
    node: process.version,
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    // Runtime config types an array of objects loosely.
    database: await databaseState(release.migrations as { tag: string, when: number }[])
  }
})
