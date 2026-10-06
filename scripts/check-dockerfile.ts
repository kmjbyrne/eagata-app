// Fails when the Dockerfile's Node version differs from the Volta pin, or when
// a workspace package's manifest isn't copied into its install stage. Without
// the manifest, the image's frozen install fails, or the package's
// dependencies are missing at runtime.
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const dockerfile = readFileSync('Dockerfile', 'utf8')
const missing = readdirSync('packages', { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(`packages/${entry.name}/package.json`))
  .map(entry => `packages/${entry.name}/package.json`)
  .filter(manifest => !dockerfile.includes(`COPY ${manifest} `))

if (missing.length) {
  console.error(`The Dockerfile's install stage doesn't copy ${missing.join(', ')}. Add a COPY line for each.`)
  process.exit(1)
}

const volta = (JSON.parse(readFileSync('package.json', 'utf8')) as { volta?: { node?: string } }).volta?.node
const pinned = /^ARG NODE_VERSION=(\S+)$/m.exec(dockerfile)?.[1]
if (volta !== pinned) {
  console.error(`The Dockerfile's NODE_VERSION is ${pinned}, but Volta pins ${volta}. Make them match.`)
  process.exit(1)
}
