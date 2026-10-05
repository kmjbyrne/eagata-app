# @kmjbyrne/oidc

OpenID Connect sign-in for Node: the authorization code flow with PKCE, for a
confidential client. It has no Nuxt dependency and knows nothing about any app.
It works with any OIDC provider that publishes a discovery document.

## Install

The package is published to npm with restricted access, so installing it needs
an npm login with access to the `@kmjbyrne` scope:

```bash
npm login
pnpm add @kmjbyrne/oidc
```

Inside this repository, depend on it from the workspace instead:

```json
{ "dependencies": { "@kmjbyrne/oidc": "workspace:*" } }
```

## Usage

Start a sign-in by creating an authorization request. Keep its `state`, `nonce`
and `codeVerifier` somewhere only this browser can read back, such as a sealed
cookie, and redirect to its `url`:

```ts
import { OidcClient } from "@kmjbyrne/oidc";

const client = new OidcClient({
  issuer: "https://accounts.google.com",
  issuerAliases: ["accounts.google.com"],
  clientId: process.env.OIDC_CLIENT_ID!,
  clientSecret: process.env.OIDC_CLIENT_SECRET!,
  redirectUri: "https://app.example.com/api/auth/callback",
});

const request = await client.authorizationRequest();
```

On the callback, check that the returned `state` matches the stored one, then
complete the sign-in with the code:

```ts
const identity = await client.complete(code, request);
```

`identity` is an `OidcIdentity`:

| Field           | Meaning                                                    |
| --------------- | ---------------------------------------------------------- |
| `issuer`        | The provider's issuer, from its discovery document         |
| `subject`       | The provider's stable id for the account (the `sub` claim) |
| `email`         | The email as the provider sent it, not normalized          |
| `emailVerified` | Whether the provider says it verified the email            |
| `picture`       | A profile picture URL, or `null`                           |

Key accounts on `issuer` and `subject`, never on the email, which can change.

## API

- `OidcClient(config, fetch?)` implements `OidcClientLike`. Pass a `fetch` to
  test without a network.
- `OidcClientLike` has `authorizationRequest()` and `complete(code, request)`. A
  stand-in for development implements the same interface.
- `OidcError` is thrown for every failed check, failed request and malformed
  response.

Discovery is cached for an hour, and `exp` allows 60 seconds of clock skew. The
discovery document's `issuer` must equal the configured issuer exactly, as
OpenID Connect Discovery 1.0, section 4.3, requires. Aliases apply only to the
`iss` claim in ID tokens.

## Why the ID Token Signature Is Not Checked

The ID token comes straight from the provider's token endpoint over TLS, in
exchange for the client secret. OpenID Connect Core 1.0, section 3.1.3.7, allows
the TLS server check to stand in for the signature check in that case. That
saves fetching and caching the provider's signing keys. The claims are still
checked: `iss` (against the issuer and its aliases), `aud`, `exp`, `nonce`, and
the presence of `sub` and `email`.
