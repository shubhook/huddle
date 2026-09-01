# `@huddle/server`

HTTP API and WebSocket layer for Huddle.

> History is REST. Live messages are WebSocket. Same port, same cookie JWT.

## Stack

| Piece | Choice |
| --- | --- |
| Runtime | Bun |
| HTTP | Express 5 |
| WebSocket | `ws` (`noServer` + HTTP upgrade) |
| DB | PostgreSQL + Prisma |
| Auth | httpOnly `jwt_token` cookie |

## Run

From this directory (or via root `bun run dev:server`):

```bash
bun install
bun run src/index.ts
```

Default listen address is `http://localhost:3000`.

### Required env

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Signs and verifies cookies |
| `CLIENT_ID` | GitHub OAuth app id |
| `CLIENT_SECRET` | GitHub OAuth secret |
| `GITHUB_REDIRECT_URI` | OAuth callback URL |
| `DATABASE_URL` | Prisma Postgres URL |

Optional: `PORT` (defaults to `3000`).

Generate the Prisma client after schema changes:

```bash
bunx prisma generate
```

## Routes (high level)

| Area | Prefix / notes |
| --- | --- |
| Auth | `/auth/*` signup, signin, logout, me, GitHub |
| Workspaces | `/workspaces` create, invite, join, details |
| Channels | create under workspace, history at `/channels/:id/messages` |
| DMs | `/dm/:userId` REST only |
| Health | `GET /health` |

CORS is currently fixed to `http://localhost:3008` for local web.

## WebSocket

Upgrade hits the same server. Auth reads `jwt_token` from the cookie header. Failures get `401` and a destroyed socket.

| Client frame | Behavior |
| --- | --- |
| `join_channel` | Membership checks, add socket to room map, ack |
| `send_message` | Persist message, broadcast `new_message` |
| `leave_channel` | Remove socket from room map |
| `send_direct_message` | Stub ack |
| `leave_direct_message` | Stub ack |

Rooms are:

```ts
Map<channelId, Set<AuthenticatedWebSocket>>
```

That map is process-local. Redis is listed in Compose and dependencies, but this package does not import or use it.

## Notes

| Topic | Detail |
| --- | --- |
| REST send | `POST /channel/:id/messages` persists and does not fan out. The web UI uses the socket path. |
| JWT expiry | Tokens are signed without `expiresIn`. |
| Presence | Not implemented. |
| Scaling | One process only until a broker sits behind the room map. |
