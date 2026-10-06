# Auth and sessions

Login is a cookie, not a token the SPA stores. The cookie names a row in `Session`. Revoking that row kills the login, including open sockets, without waiting for JWT expiry.

## Cookie

Name: `jwt_token`. `httpOnly`, path `/`.

| Mode | SameSite | Secure |
| --- | --- | --- |
| Local HTTP (`COOKIE_SECURE` unset) | `Lax` | false |
| HTTPS (`COOKIE_SECURE=true`) | `None` | true |

The SPA and API are different origins, so production needs `SameSite=None` or the cookie is not sent on axios. Firefox also partitions a `Lax` cookie set during the GitHub redirect, which is why OAuth without `None` bounces back to sign-in.

Code: `apps/server/src/utils/cookies.ts`.

## Session row

`startSession` in `apps/server/src/services/session.service.ts` inserts a row (7 day expiry, optional user-agent) and signs `{ userId, sid }` with HS256.

`requireAuth` and the WebSocket upgrade both:

1. Verify the signature and expiry (`apps/server/src/utils/token.ts`).
2. Load the row. Refuse if it is missing, revoked, expired, or belongs to another user.

Old tokens with no `sid` fail on purpose. They could never be revoked.

Expired rows are deleted at boot and hourly. Revoked rows stay until they expire, so a copied token cannot come back to life.

## Email and password

| Rule | Detail |
| --- | --- |
| Signup | Username 3 to 32 (`[\w.-]+`), email stored lowercase, password 8 to 72 bytes (bcrypt ignores the rest) |
| Sign-in | Does not apply those rules, so older accounts still work |
| Timing | Unknown email, wrong password, and GitHub-only account all return the same 401. bcrypt still runs, including against a dummy hash when the account is missing |
| Taken account | Signup returns one message for a taken email or username, so the response does not say which |

Routes: `POST /auth/signup`, `POST /auth/signin`, `GET /auth/me`, `POST /auth/logout`.

Logout revokes the caller's session and clears the cookie. Safe to call twice. Returns 503 and keeps the cookie if the database is down, so the user can retry.

## Session list

There is no UI for this yet. The API is there:

| Endpoint | What it does |
| --- | --- |
| `GET /auth/sessions` | Active sessions. The one making the request has `current: true` |
| `DELETE /auth/sessions/:id` | Revoke one of your own. Another user's id returns 404 |
| `POST /auth/sessions/revoke-all` | Revoke every session. `{ "keepCurrent": true }` keeps the caller's |

Revoking a session publishes `revoke_sessions` on the [event bus](./realtime.md), so every API process closes those sockets with code 4401. The client treats 4401 as "do not reconnect."

## GitHub OAuth

Optional. Unset `CLIENT_ID` / `CLIENT_SECRET` and the GitHub button still shows, but `/auth/github` returns 503.

Flow:

1. `GET /auth/github` sets a single-use state cookie and redirects to GitHub with `read:user` and `user:email`.
2. `GET /auth/github/callback` checks state, reads `/user` and `/user/emails`, and requires a primary verified email.
3. `resolveGithubUser` (`apps/server/src/services/github-identity.ts`) matches on GitHub's numeric id.

Matching on email alone was the old behavior. Signup does not verify email, so someone could register `victim@example.com`, wait for the real person to click GitHub, and own that login. Now:

- A known GitHub id always logs into its own account.
- An email that belongs to a password account, or another GitHub id, is refused (`email_in_use`).
- Failures redirect to `#/signin/<code>` (`github_denied`, `invalid_state`, `no_verified_email`, `email_in_use`, `github_failed`).

There is no way to link GitHub to an existing password account, and no password reset.
