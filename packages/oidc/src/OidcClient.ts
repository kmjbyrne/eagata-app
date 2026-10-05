import { createHash, randomBytes } from 'node:crypto'

export interface OidcClientConfig {
  issuer: string
  /** Other spellings of the issuer the provider puts in `iss`. */
  issuerAliases?: string[]
  clientId: string
  clientSecret: string
  redirectUri: string
  /** For each discovery and token request. Defaults to 10 seconds. */
  timeoutMs?: number
}

/** The secrets one sign-in round trip must carry from start to callback. */
export interface AuthorizationRequest {
  url: string
  state: string
  nonce: string
  codeVerifier: string
}

/** What the provider asserted about the person who just signed in. */
export interface OidcIdentity {
  issuer: string
  subject: string
  email: string
  emailVerified: boolean
  picture: string | null
}

export interface AuthorizationOptions {
  /** The account to preselect, usually an email. Sent as `login_hint`. */
  loginHint?: string
}

export interface OidcClientLike {
  authorizationRequest(options?: AuthorizationOptions): Promise<AuthorizationRequest>
  complete(code: string, request: Pick<AuthorizationRequest, 'nonce' | 'codeVerifier'>): Promise<OidcIdentity>
}

interface Discovery {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
}

export class OidcError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OidcError'
  }
}

const DISCOVERY_TTL_MS = 60 * 60 * 1000
const CLOCK_SKEW_S = 60
const DEFAULT_TIMEOUT_MS = 10_000

function randomToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Authorization code flow with PKCE for a confidential client.
 *
 * The ID token's signature is not checked. It comes straight from the token
 * endpoint over TLS, in exchange for our client secret, which OIDC Core
 * 3.1.3.7 accepts in place of a signature check. Its claims still are.
 */
export class OidcClient implements OidcClientLike {
  private discovery?: { value: Discovery, expiresAt: number }

  constructor(
    private readonly config: OidcClientConfig,
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  async authorizationRequest(options: AuthorizationOptions = {}): Promise<AuthorizationRequest> {
    const { authorization_endpoint } = await this.discover()
    const state = randomToken()
    const nonce = randomToken()
    const codeVerifier = randomToken()
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
      code_challenge_method: 'S256',
      prompt: 'select_account'
    })
    if (options.loginHint) {
      params.set('login_hint', options.loginHint)
    }
    return { url: `${authorization_endpoint}?${params}`, state, nonce, codeVerifier }
  }

  async complete(code: string, request: Pick<AuthorizationRequest, 'nonce' | 'codeVerifier'>): Promise<OidcIdentity> {
    const { token_endpoint, issuer } = await this.discover()
    const response = await this.request('Token exchange', token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code_verifier: request.codeVerifier
      })
    })
    if (!response.ok) {
      throw new OidcError(`Token exchange failed: ${response.status} ${await response.text().catch(() => '')}`)
    }
    const { id_token: idToken } = await response.json() as { id_token?: string }
    if (!idToken) {
      throw new OidcError('Token response has no id_token')
    }

    const claims = decodeClaims(idToken)
    const issuers = [issuer, ...(this.config.issuerAliases ?? [])]
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    const now = Math.floor(Date.now() / 1000)
    if (typeof claims.iss !== 'string' || !issuers.includes(claims.iss)) {
      throw new OidcError(`Unexpected issuer: ${claims.iss}`)
    }
    if (!audiences.includes(this.config.clientId)) {
      throw new OidcError('ID token is for another client')
    }
    // OIDC Core 3.1.3.7: several audiences require azp, and azp must be us.
    if ((audiences.length > 1 || claims.azp !== undefined) && claims.azp !== this.config.clientId) {
      throw new OidcError('ID token was issued to another party')
    }
    if (typeof claims.exp !== 'number' || claims.exp + CLOCK_SKEW_S < now) {
      throw new OidcError('ID token expired')
    }
    if (claims.nonce !== request.nonce) {
      throw new OidcError('ID token nonce does not match')
    }
    if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.email !== 'string') {
      throw new OidcError('ID token lacks sub or email')
    }

    return {
      issuer,
      subject: claims.sub,
      email: claims.email,
      emailVerified: claims.email_verified === true || claims.email_verified === 'true',
      picture: typeof claims.picture === 'string' && claims.picture ? claims.picture : null
    }
  }

  private async discover(): Promise<Discovery> {
    if (this.discovery && Date.now() < this.discovery.expiresAt) {
      return this.discovery.value
    }
    const url = `${this.config.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`
    const response = await this.request('Discovery', url)
    if (!response.ok) {
      throw new OidcError(`Discovery failed: ${response.status}`)
    }
    const value = await response.json() as Discovery
    // OIDC Discovery 1.0, section 4.3: a mismatch can mean a spoofed document.
    if (value.issuer !== this.config.issuer) {
      throw new OidcError(`Discovery issuer ${value.issuer} does not match ${this.config.issuer}`)
    }
    this.discovery = { value, expiresAt: Date.now() + DISCOVERY_TTL_MS }
    return value
  }

  private async request(label: string, url: string, init: RequestInit = {}): Promise<Response> {
    const timeoutMs = this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS
    try {
      return await this.fetchFn(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new OidcError(`${label} timed out after ${timeoutMs} ms`)
      }
      throw error
    }
  }
}

function decodeClaims(jwt: string): Record<string, unknown> {
  const payload = jwt.split('.')[1]
  if (!payload) {
    throw new OidcError('Malformed ID token')
  }
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    throw new OidcError('Malformed ID token')
  }
}
