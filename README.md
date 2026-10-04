# Huddle

> Live team chat. You join a workspace, open a channel, and messages show up as they are sent.

I built this to learn WebSockets. The rest of the app exists so that socket has somewhere real to live.

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | Bun + TypeScript |
| API | Express 5 |
| Realtime | `ws` on the same HTTP server |
| Database | PostgreSQL via Prisma |
| Frontend | React + Tailwind |
| Local infra | Docker Compose (Postgres, and Redis if you want several API processes) |
| Deploy | Cloud server (not a self-host product) |

Redis is optional. With `REDIS_URL` set, realtime events go through Redis pub/sub so several API processes can share channels. Without it, or while Redis is down, each process delivers to its own sockets only.

## What works

| Area | Status |
| --- | --- |
| Email/password auth | Working |
| GitHub OAuth | Optional (needs `CLIENT_ID` / `CLIENT_SECRET`) |
| Workspaces + invite links | Working |
| Channel message history (REST) | Working |
| Live channel chat (WebSocket) | Working. Reconnects on its own, acks sends, fills gaps after a reconnect |
| Several API processes | Working with `REDIS_URL`, falls back to one process without it |
| Logout and session revocation | Working. Ending a session kills the token, not just the cookie |
| Cursor pagination on history | Server side yes, client ignores cursor |

## Not built yet

| Claim you might expect | Reality |
| --- | --- |
| Presence | Not implemented |
| Direct messages in the UI | REST exists. The socket answers `not_supported`. No UI. |
| History past the newest 50 | Server supports a cursor. The client does not send it. A reconnect after a long outage fills at most 50 missed messages. |
| Message rate limit | Only a cap on frames in flight per socket |

## Repo layout

```
apps/server   API + WebSocket
apps/web      React client
```

## Run locally (fresh clone)

Needs **Bun**, **Docker** (for Postgres), and env files below.

### 1. Install

```bash
git clone https://github.com/shubhook/huddle.git
cd huddle
bun install
```

### 2. Env

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env   # optional; defaults already point at :3000
```

Edit `apps/server/.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | yes | Signs the login token. Use 32+ random characters (`openssl rand -base64 48`). With `NODE_ENV=production` the server refuses to start on a short or example value |
| `DATABASE_URL` | yes | Postgres (match Compose defaults below) |
| `PORT` | no | API port (default `3000`) |
| `CLIENT_ORIGIN` | no | Credentialed CORS origins (default `http://localhost:3008,http://127.0.0.1:3008`) |
| `COOKIE_SECURE` | no | `true` only on HTTPS |
| `REDIS_URL` | no | Share realtime events and rate limit counters between API processes. The Compose Redis needs a password: `redis://:huddle@localhost:6379`. Inside Compose the API gets the right URL automatically |
| `TRUST_PROXY` | no | Number of reverse proxies in front of the API, usually `1`. Needed so rate limits see each client's IP. Never `true` |
| `RATE_LIMIT_DISABLED` | no | Testing only. Turns off the login, signup and invite limits |
| `WS_HEARTBEAT_MS` | no | Ping interval, default `30000`. A socket with no pong after one interval is closed |
| `WS_MEMBERSHIP_RECHECK_MS` | no | How often subscribed users are re-checked against channel membership, default `60000` |
| `CLIENT_ID` / `CLIENT_SECRET` / `GITHUB_REDIRECT_URI` | no | GitHub OAuth; omit for email/password only |

Web:

| Variable | Purpose |
| --- | --- |
| `BUN_PUBLIC_API_URL` | API origin (default `http://localhost:3000`) |
| `BUN_PUBLIC_WS_URL` | Optional WS override; else `http`→`ws` on the API URL |

Use **either** `localhost` **or** `127.0.0.1` consistently in the browser and in `CLIENT_ORIGIN` / `BUN_PUBLIC_API_URL`. Mixing them breaks cookies.

### 3. Postgres

```bash
# Postgres only. Add `redis` to the command if you set REDIS_URL.
docker compose up postgres -d
```

Compose defaults: user/password/db `huddle`, port `5432`. Postgres and Redis are published on `127.0.0.1` only, so nothing outside your machine can reach them. Set `POSTGRES_PASSWORD` and `REDIS_PASSWORD` (letters and digits only, they go into connection URLs) anywhere beyond a laptop. The Postgres password only applies when its data volume is first created. An existing volume keeps the old one.

```bash
cd apps/server
bunx prisma generate
bunx prisma migrate deploy
cd ../..
```

### 4. Start API + web

```bash
# from repo root — API :3000, web :3008
bun run dev
```

Or separately:

```bash
bun run dev:server
bun run dev:web
```

| Process | Default URL |
| --- | --- |
| API + WebSocket | `http://localhost:3000` (`ws://localhost:3000`) |
| Web | `http://localhost:3008` |

### Smoke check (curl)

```bash
curl -s http://localhost:3000/health
# {"status":"ok"}

curl -s -c /tmp/huddle.jar -H 'Content-Type: application/json' \
  -d '{"username":"demo","email":"demo@example.com","password":"password123"}' \
  http://localhost:3000/auth/signup

curl -s -b /tmp/huddle.jar http://localhost:3000/auth/me
```

Then in the UI: sign in → create workspace → open channel. History loads over REST (`GET /channels/:id/messages`). Live sends use the WebSocket (`join_channel` / `send_message`); the browser attaches the `jwt_token` cookie on upgrade.

### Full Compose (API in Docker)

```bash
docker compose up --build
```

Needs a filled `apps/server/.env`. Starts API, Postgres, and Redis. Web is **not** a Compose service — still run `bun run dev:web`.

## Security

| Area | What the server does |
| --- | --- |
| Passwords | Signup needs 8 to 72 bytes (bcrypt ignores the rest), a valid email, and a 3 to 32 character username. Emails are stored lowercase and matched without regard to case. Sign-in does not apply these rules, so older accounts still work |
| Rate limits | Sign-in: 30 per 15 minutes per IP and 10 per 15 minutes per account. Signup: 10 per hour per IP. Joining: 20 per hour per user. Invites: 20 per hour per user. They use Redis when it is up, so processes share counts, and fall back to memory per process. Answers are 429 with `Retry-After` |
| Sign-in answers | An unknown email, a wrong password and a GitHub-only account all return the same 401 and take about as long, because bcrypt runs for each |
| GitHub login | A GitHub id logs into its own account. If the verified GitHub email belongs to a password account, login is refused with `email_in_use`. Matching on email alone let someone register a victim's address first and receive the victim's GitHub login. Only read-only scopes are requested, and the OAuth state is single use |
| Roles | Only an owner can create, list or revoke invites. At most 25 invites can be active. Any member can create channels |
| Direct messages | Sender and receiver must both belong to the named workspace |
| Headers | `nosniff`, `X-Frame-Options: DENY`, no referrer, a blocking CSP, `Cache-Control: no-store`, and HSTS when `COOKIE_SECURE=true`. `X-Powered-By` is off |
| Cross-site requests | POST, PUT, PATCH and DELETE are refused with 403 when the browser's `Origin` (or, without one, `Referer`) is not in `CLIENT_ORIGIN`. With `COOKIE_SECURE=true` the login cookie is `SameSite=None`, so without this check any website could submit a form that joins a workspace or signs the user out everywhere. Requests with neither header, such as curl, are allowed and still need a session |
| Websocket | Origin allowlist, frame size cap, and the session checks described below |

Known gaps:

- Signup cannot hide whether an email or username is taken without sending a verification email, which the app does not do. The response is the same for both and signup is rate limited, so it costs an attacker time but not certainty. The same gap lets someone register an address they do not own. Email verification is the real fix.
- An invite link works for any number of people until it expires or an owner revokes it.
- The web dev server sets no security headers of its own. Put a proxy in front of it when you deploy.
- There is no password reset, and no way to link a GitHub account to an existing password account.

## Sessions

A signed JWT cannot be cancelled by itself, so every login creates a row in the `Session` table and the token carries its id as `sid`. `requireAuth` and the websocket upgrade verify the signature, then load the row. The request is refused when the row is missing, revoked, expired, or belongs to another user.

| Endpoint | What it does |
| --- | --- |
| `POST /auth/logout` | Revokes the caller's session and clears the cookie. Safe to call twice. Returns 503 and keeps the cookie if the database is down, so the user can retry |
| `GET /auth/sessions` | Lists the user's active sessions. The one making the request has `current: true` |
| `DELETE /auth/sessions/:id` | Revokes one of the user's own sessions. Another user's id returns 404 |
| `POST /auth/sessions/revoke-all` | Revokes every session. Send `{ "keepCurrent": true }` to keep the caller's |

Revoking a session also closes its sockets, on every API process. Sessions last 7 days, and expired rows are deleted at boot and hourly. Revoked rows stay until they expire, so a copied token cannot come back to life.

Tokens issued before this change have no `sid` and are rejected, so everyone signs in once after the upgrade. Tokens are pinned to HS256.

Run `bunx prisma generate` and `bunx prisma migrate deploy` in `apps/server` after pulling, since this adds the `Session` table. There is no web UI for listing or revoking sessions yet.

## Realtime model

History comes over HTTP. Live messages come over WebSocket.

1. Browser opens `ws://...` with the `jwt_token` cookie. The server checks the `Origin` header against `CLIENT_ORIGIN` first, then the JWT.
2. Client sends `join_channel` and gets `join_channel_ack`. It then fetches history, so nothing sent after the join is missed. Live and fetched messages are merged by id.
3. Client sends `send_message` with a `clientMessageId`. The server replies `send_message_ack` with the saved id, or an `error` frame carrying the same `clientMessageId`.
4. The server saves the message once, in `services/message.service.ts`, then publishes it on the event bus. REST (`POST /channel/:id/messages`) uses the same function, so both paths reach live sockets.
5. Every API process receives the event and sends `new_message` to its own sockets in that channel. Without Redis the bus is in-process.

Rules the server enforces:

| Rule | Detail |
| --- | --- |
| Frame shape | zod schema in `socket/schema.ts`. Bad JSON, unknown types, and bad fields get an `error` frame with a `code` |
| Size | Frames over 16 KB close the socket with code 1009. Message content is capped at 4000 characters on REST and the socket |
| Order | One frame at a time per socket, so a leave cannot overtake a join |
| Liveness | Server pings every `WS_HEARTBEAT_MS`. A peer that misses a pong is terminated |
| Session | The socket is checked against its `Session` row at connect, on revocation, and every `WS_MEMBERSHIP_RECHECK_MS`. An ended or expired session closes the socket with code 4401 on every process |
| Membership | Checked on join and on every send. Subscribed users are re-checked every `WS_MEMBERSHIP_RECHECK_MS` and removed users get `removed_from_channel` |

Close code 4401 tells the client not to reconnect. Any other close makes the client retry with exponential backoff and jitter (500 ms up to 15 s) and rejoin its channel.

Bun's `ws` ignores the `maxPayload` option, so the size limit is also checked in code. A frame is fully received before it is rejected. Bun's own ceiling applies to how large that frame can be.

## Status

Work in progress. The socket now has validation, acks, reconnect, heartbeats, and Redis fan-out. Next is presence and direct messages over the socket.
