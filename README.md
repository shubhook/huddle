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
| Local infra | Docker Compose (API, Postgres, Redis container) |
| Deploy | Cloud server (not a self-host product) |

Redis is in Compose and in `package.json`. Nothing in the app imports it yet. Fan-out today is an in-memory `Map` of sockets per channel.

## What works

| Area | Status |
| --- | --- |
| Email/password auth | Working |
| GitHub OAuth | Working |
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

## Run locally

Needs Bun, Docker (for Postgres), and env in `apps/server/.env`.

```bash
# from repo root
bun install
bun run dev
```

| Process | Default URL |
| --- | --- |
| API + WebSocket | `http://localhost:3000` |
| Web | `http://localhost:3008` |

Or bring up the API stack with Compose:

```bash
docker compose up --build
```

Compose starts the API, Postgres, and an unused Redis. The web app is not a Compose service. Run it with `bun run dev:web`.

### Server env

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Cookie JWT |
| `CLIENT_ID` | GitHub OAuth |
| `CLIENT_SECRET` | GitHub OAuth |
| `GITHUB_REDIRECT_URI` | OAuth callback |
| `DATABASE_URL` | Postgres |
| `PORT` | API port (default `3000`) |

### Web env

| Variable | Purpose |
| --- | --- |
| `BUN_PUBLIC_API_URL` | API origin (default `http://localhost:3000`) |

## Realtime model

History comes over HTTP. Live messages come over WebSocket.

1. Browser opens `ws://…` with the `jwt_token` cookie on upgrade.
2. Client sends `join_channel`.
3. Client sends `send_message`.
4. Server writes to Postgres, then fans out `new_message` to sockets in that channel's set.

That set lives in process memory. A second API process will not see it.

## Status

Work in progress. Next work deepens the socket (honest UI, reconnect, heartbeats, then Redis), not a wider chat feature set.
