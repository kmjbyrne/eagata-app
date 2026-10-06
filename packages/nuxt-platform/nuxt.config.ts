import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// What this build is, fixed when the app is built, for Settings, Application.
// Docker builds have no .git, so the build passes GIT_COMMIT in.
function git(...args: string[]): string {
  try {
    return execFileSync('git', args, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

function readJson<T>(path: string): T | null {
  const file = resolve(process.cwd(), path)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as T : null
}

const journal = readJson<{ entries: { tag: string, when: number }[] }>('server/migrations/meta/_journal.json')

// The platform admin area, for the app's operators. An app extends it only
// when NUXT_PLATFORM=true, so builds without it contain none of its code.
export default defineNuxtConfig({
  extends: ['@kmjbyrne/nuxt-shell'],

  runtimeConfig: {
    // blue or green, per container, when deploying side by side.
    deploymentSlot: '',
    release: {
      version: readJson<{ version?: string }>('package.json')?.version ?? '',
      commit: process.env.GIT_COMMIT || git('rev-parse', '--short', 'HEAD') || 'unknown',
      commitDate: process.env.GIT_COMMIT_DATE || git('show', '-s', '--format=%cI', 'HEAD'),
      builtAt: new Date().toISOString(),
      platform: process.env.NUXT_PLATFORM === 'true',
      // The app's migrations, to compare with what the database has applied.
      migrations: (journal?.entries ?? []).map(({ tag, when }) => ({ tag, when }))
    }
  },

  routeRules: {
    '/platform/**': { ssr: false }
  }
})
