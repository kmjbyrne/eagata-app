// Builds the app as production does and fails if dev-only sandbox code, or the
// platform area when it's switched off, reached the build. Each pattern only
// exists in the code it stands for, so any hit means something imported it.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const OUTPUT = '.output'

const SANDBOX = ['/_sandbox/', 'FakeOidcClient', 'Dev sign-in', 'defineSandbox', 'tenancyDevUsers', 'Dana Deactivated', 'pat@example.com', 'lowdb', 'sandboxFixtures1']
const PLATFORM = ['/api/protected/', 'Show personal organizations', 'PlatformCreateOrgModal']

function build(platform: boolean) {
  console.log(`Building with NUXT_PLATFORM=${platform}`)
  execFileSync('pnpm', ['exec', 'nuxt', 'build'], { stdio: 'ignore', env: { ...process.env, NUXT_PLATFORM: String(platform) } })
}

function files(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && !entry.name.endsWith('.map'))
    .map(entry => join(entry.parentPath, entry.name))
}

/** Each pattern found in the build, with the files that hold it. */
function scan(patterns: string[]): Map<string, string[]> {
  const found = new Map<string, string[]>()
  for (const file of files(OUTPUT)) {
    const text = readFileSync(file, 'utf8')
    for (const pattern of patterns.filter(candidate => text.includes(candidate))) {
      found.set(pattern, [...(found.get(pattern) ?? []), file])
    }
  }
  return found
}

function report(label: string, found: Map<string, string[]>): boolean {
  for (const [pattern, where] of found) {
    console.error(`  ${label}: "${pattern}" in ${where.slice(0, 3).join(', ')}${where.length > 3 ? ` and ${where.length - 3} more` : ''}`)
  }
  return found.size === 0
}

let ok = true

build(false)
ok = report('Sandbox code', scan(SANDBOX)) && ok
ok = report('Platform code with NUXT_PLATFORM=false', scan(PLATFORM)) && ok

build(true)
ok = report('Sandbox code', scan(SANDBOX)) && ok
const platform = scan(PLATFORM)
if (platform.size !== PLATFORM.length) {
  console.error(`  The platform build lacks ${PLATFORM.filter(pattern => !platform.has(pattern)).join(', ')}, so this check can't be trusted. Update its patterns.`)
  ok = false
}

if (!ok) {
  console.error('check:bundle failed')
  process.exit(1)
}
console.log('Production builds are free of sandbox code, and of platform code when it\'s off.')
