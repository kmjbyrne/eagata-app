import { fileURLToPath } from 'node:url'
import { setupApp } from '../testing'

/** The shell layer, booted as an app. */
export const setupLayer = () => setupApp(fileURLToPath(new URL('..', import.meta.url)))
