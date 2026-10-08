# Architecture

Two processes, one database, an optional Redis.

```text
browser
  HTTP  (axios, cookie jwt_token)  -->  Express API  :3000  -->  Postgres
  WebSocket (same cookie, same port) --^
                                           |
                                           +--> Redis pub/sub  (optional)
web SPA  :3008
  hash router, no backend of its own
```

Production keeps that split. Vercel serves the SPA. Coolify runs the API image. Postgres is Supabase. Details in [deploy](./deploy.md).

History is REST. Live messages are WebSocket. Both write through `sendChannelMessage` in `apps/server/src/services/message.service.ts`, so a REST send still reaches live sockets.

## Why it looks like this

The API and the web app are different origins (`:3000` and `:3008`). The login cookie is `httpOnly`, so the SPA never reads it. Credentialed axios and the WebSocket upgrade both attach it because they talk to the API host.

Hash routing (`#/app/<workspaceId>`) keeps the web server a static file host. Bun serves `index.html` for every path.

Redis is not required for a single API process. Set `REDIS_URL` when you run more than one, or when you want rate-limit counters shared. If Redis is down, the API keeps working inside that process.

## Packages

| Path | Job |
| --- | --- |
| `apps/server` | Express routes, Prisma, `ws` upgrade, Redis bus |
| `apps/web` | React UI, axios, browser WebSocket |
| `packages/protocol` | Zod schemas for socket frames, shared by the API and the web client |

Client frames, server frames, and close code 4401 are defined once, in `@huddle/protocol`.

## Request path (signed-in chat)

1. `POST /auth/signin` sets `jwt_token` and a `Session` row.
2. The SPA goes to `#/app`, then `GET /workspaces` and `GET /workspaces/:id`.
3. `connectSocket()` opens `ws://localhost:3000`. The upgrade checks Origin, then the cookie, then the Session row.
4. The server subscribes the socket to all of the user's channels and sends `subscribed`. The client then fetches `GET /channels/:id/messages?after=<newest id it has>` per channel. Subscribe first, so nothing sent after it is missed. Live and fetched messages are merged by id.
5. A send is `send_message` with a `clientMessageId`. The server saves the row, publishes on the bus, and replies `send_message_ack`.

Details: [auth](./auth.md), [workspaces](./workspaces.md), [realtime](./realtime.md), [web](./web.md).

## Data

Prisma schema lives in `apps/server/prisma/schema.prisma`. The important tables:

| Model | Role |
| --- | --- |
| `User` | Email / username / optional password / optional `githubId` |
| `Session` | One row per login. The JWT carries its id as `sid` |
| `Workspace` / `WorkspaceMember` | Membership and role (`owner` or `member`) |
| `Channel` / `ChannelMember` | A channel, who is in it, and each member's read marker (`lastReadMessageId`) |
| `Message` | Channel history. Indexed on `(channelId, createdAt, id)` for paging. Unique `(senderId, clientMessageId)` makes sends idempotent |
| `WorkspaceInvites` | Token, expiry, who created it |
| `DirectMessage` | REST only. The socket does not carry these |

## What this is not

Huddle is not a self-host product with an installer. The live instance is Vercel plus Coolify plus Supabase, documented in [deploy](./deploy.md). There is no presence, no search, and no DM UI.
