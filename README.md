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
| Local infra | Docker Compose (Postgres; Redis container unused by app code) |
| Deploy | Cloud server (not a self-host product) |

Redis is in Compose and in `package.json`. Nothing in the app imports it yet. Fan-out today is an in-memory `Map` of sockets per channel.

## What works

| Area | Status |
| --- | --- |
| Email/password auth | Working |
| GitHub OAuth | Optional (needs `CLIENT_ID` / `CLIENT_SECRET`) |
| Workspaces + invite links | Working |
| Channel message history (REST) | Working |
| Live channel chat (WebSocket) | Working, single process |
| Cursor pagination on history | Server side yes, client ignores cursor |

## Not built yet

| Claim you might expect | Reality |
| --- | --- |
| Redis pub/sub | Container only. No app code. |
| Presence | Not implemented |
| Direct messages in the UI | REST exists. Socket handlers are stubs. No UI. |
| Multi-instance fan-out | Impossible until Redis (or similar) is wired |

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
| `JWT_SECRET` | yes | Signs httpOnly `jwt_token` cookie |
| `DATABASE_URL` | yes | Postgres (match Compose defaults below) |
| `PORT` | no | API port (default `3000`) |
| `CLIENT_ORIGIN` | no | Credentialed CORS origins (default `http://localhost:3008,http://127.0.0.1:3008`) |
| `COOKIE_SECURE` | no | `true` only on HTTPS |
| `CLIENT_ID` / `CLIENT_SECRET` / `GITHUB_REDIRECT_URI` | no | GitHub OAuth; omit for email/password only |

Web:

| Variable | Purpose |
| --- | --- |
| `BUN_PUBLIC_API_URL` | API origin (default `http://localhost:3000`) |
| `BUN_PUBLIC_WS_URL` | Optional WS override; else `http`→`ws` on the API URL |

Use **either** `localhost` **or** `127.0.0.1` consistently in the browser and in `CLIENT_ORIGIN` / `BUN_PUBLIC_API_URL`. Mixing them breaks cookies.

### 3. Postgres

```bash
# Postgres only — Redis is unused by the app
docker compose up postgres -d
```

Compose defaults: user/password/db `huddle`, port `5432`.

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

Needs a filled `apps/server/.env`. Starts API, Postgres, and unused Redis. Web is **not** a Compose service — still run `bun run dev:web`.

## Realtime model

History comes over HTTP. Live messages come over WebSocket.

1. Browser opens `ws://…` with the `jwt_token` cookie on upgrade.
2. Client sends `join_channel`.
3. Client sends `send_message`.
4. Server writes to Postgres, then fans out `new_message` to sockets in that channel's set.

That set lives in process memory. A second API process will not see it.

## Status

Work in progress. Next work deepens the socket (honest UI, reconnect, heartbeats, then Redis), not a wider chat feature set.
