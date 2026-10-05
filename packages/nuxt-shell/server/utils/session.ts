import type { UserId } from '@kmjbyrne/core'
import type { H3Event, SessionConfig } from 'h3'

const SESSION_COOKIE = 'session'
const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60
const FLOW_COOKIE = 'sign-in'
const FLOW_MAX_AGE_S = 10 * 60
const DEV_SECRET = 'nuxt-shell-dev-only-session-secret-0123456789'

/**
 * The signed-in user, plus the last-used workspace. The workspace is only
 * where `/` takes the user next time. It never decides what a request acts
 * on: the URL does.
 */
export interface SessionData {
  userId?: UserId
  lastOrg?: string
  lastWorkspace?: string
}

/** One sign-in round trip, from the redirect to the provider until the callback. */
export interface FlowData {
  state?: string
  nonce?: string
  codeVerifier?: string
}

function sessionConfig(name: string, maxAge: number): SessionConfig {
  const password = useRuntimeConfig().sessionSecret || (import.meta.dev ? DEV_SECRET : '')
  if (password.length < 32) {
    throw new Error('NUXT_SESSION_SECRET must be at least 32 characters')
  }
  return {
    name,
    password,
    maxAge,
    // h3 otherwise also reads the session from an x-<name>-session header.
    sessionHeader: false,
    cookie: { path: '/', httpOnly: true, secure: !import.meta.dev, sameSite: 'lax' }
  }
}

export async function readSession(event: H3Event): Promise<SessionData> {
  return { ...(await useSession<SessionData>(event, sessionConfig(SESSION_COOKIE, SESSION_MAX_AGE_S))).data }
}

/** Starts a fresh session, dropping anything a previous user left in it. */
export async function startSession(event: H3Event, userId: UserId): Promise<void> {
  const session = await useSession<SessionData>(event, sessionConfig(SESSION_COOKIE, SESSION_MAX_AGE_S))
  await session.update({ userId, lastOrg: undefined, lastWorkspace: undefined })
  event.context.actor = { id: userId }
}

export async function endSession(event: H3Event): Promise<void> {
  await (await useSession(event, sessionConfig(SESSION_COOKIE, SESSION_MAX_AGE_S))).clear()
  event.context.actor = undefined
}

export async function rememberWorkspace(event: H3Event, org: string, workspace: string): Promise<void> {
  await (await useSession<SessionData>(event, sessionConfig(SESSION_COOKIE, SESSION_MAX_AGE_S))).update({ lastOrg: org, lastWorkspace: workspace })
}

/**
 * Overwrites every key. A clear() then update() in one request would re-read
 * the request's old cookie and merge its values back in.
 */
export async function replaceFlow(event: H3Event, data: FlowData): Promise<void> {
  const empty: Record<keyof FlowData, undefined> = { state: undefined, nonce: undefined, codeVerifier: undefined }
  await (await useSession<FlowData>(event, sessionConfig(FLOW_COOKIE, FLOW_MAX_AGE_S))).update({ ...empty, ...data })
}

export async function readFlow(event: H3Event): Promise<FlowData> {
  return { ...(await useSession<FlowData>(event, sessionConfig(FLOW_COOKIE, FLOW_MAX_AGE_S))).data }
}

export async function endFlow(event: H3Event): Promise<void> {
  await (await useSession(event, sessionConfig(FLOW_COOKIE, FLOW_MAX_AGE_S))).clear()
}
