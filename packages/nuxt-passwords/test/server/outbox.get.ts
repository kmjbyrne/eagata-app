import { outbox } from './testPasswords'

/** Every email sent so far, oldest first. */
export default defineEventHandler(() => outbox.outbox)
