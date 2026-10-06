// Fails when a workspace package's manifest isn't copied into the Dockerfile's
// install stage. Without it the image's frozen install fails, or the package's
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
