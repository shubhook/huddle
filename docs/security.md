# Security

Huddle is a learning project that still has to not be embarrassing. The rules below are what the server actually does, not a claim that it is ready to sell.

## Passwords and login

Signup needs 8 to 72 bytes, a valid email, and a username of 3 to 32 characters. Emails are stored lowercase and matched without regard to case.

Sign-in does not apply those rules, so older accounts still work. An unknown email, a wrong password, and a GitHub-only account all return the same 401 and take about as long, because bcrypt runs for each.

## Rate limits

`apps/server/src/utils/rate-limit.ts`. Redis when it is up, memory per process otherwise. Failed and successful attempts both count. 429 includes `Retry-After`.

| Action | Cap |
| --- | --- |
| Sign-in | 30 / 15 min / IP, and 10 / 15 min / account |
| Signup | 10 / hour / IP |
| Join | 20 / hour / user, 60 / hour / IP |
| Invite | 20 / hour / user |
| Message send | 20 / 10 s / user, socket and REST together |
| Mark read | 120 / min / user |
| Open sockets | 10 / user / process (counted in memory, not Redis) |

Account keys are a SHA-256 fingerprint of the email, not the email itself. `RATE_LIMIT_DISABLED=true` turns this off. Never set that in production. The server warns on boot if you do.

`TRUST_PROXY` must be a hop count such as `1` behind a reverse proxy. `true` is ignored, because it would trust any `X-Forwarded-For` and let an attacker pick their IP.

## Cross-site writes

With `COOKIE_SECURE=true` the login cookie is `SameSite=None`, so any website can make the browser attach it. CORS only hides the response, after the server has already acted.

`rejectCrossSiteWrites` (`apps/server/src/utils/csrf.ts`) refuses POST, PUT, PATCH, and DELETE when `Origin` (or `Referer` if Origin is missing) is not in `CLIENT_ORIGIN`. `Origin: null` is never trusted. Requests with neither header, such as curl, are allowed and still need a session.

The WebSocket checks Origin the same way on upgrade.

## Headers

Set in `apps/server/src/utils/security-headers.ts` on every HTTP response:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`
- `Cache-Control: no-store`
- `Strict-Transport-Security` when `COOKIE_SECURE=true`
- `X-Powered-By` is off

The web dev server sets none of these. Vercel sets `nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer` from `vercel.json`. It does not set CSP or HSTS on the static files. The API still sets the full list above.

## GitHub

Scopes are read-only. State cookie is single use. Identity is GitHub's numeric id. See [auth](./auth.md).

## Roles and invites

Only an owner can create, list, or revoke invites. Cap 25 active. Any member can create channels. An invite link works for any number of people until it expires or is revoked.

## Known gaps

- Signup cannot hide whether an email or username is taken without sending a verification email, which the app does not do. The response is the same for both and signup is rate limited, so it costs an attacker time but not certainty. The same gap lets someone register an address they do not own.
- There is no password reset, and no way to link a GitHub account to an existing password account.
- Frame size is checked after the bytes are in memory. Bun's own ceiling is the real upper bound.
- The socket cap is per process. A user spread across several API processes can hold 10 sockets on each.
