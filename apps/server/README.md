# `@huddle/server`

HTTP API and WebSocket for Huddle. History is REST. Live messages are WebSocket. Same port, same `jwt_token` cookie.

How it works: [docs](../../docs/README.md). How to run it: [setup](../../docs/setup.md).

## Run

From repo root (preferred) or this directory:

```bash
cp .env.example .env
bunx prisma generate
bunx prisma migrate deploy
bun run src/index.ts
```

Listens on `http://localhost:3000`. Required env: `JWT_SECRET`, `DATABASE_URL`. Full table in the [setup guide](../../docs/setup.md).

## Layout

| Path | Job |
| --- | --- |
| `src/index.ts` | Express + `ws` upgrade |
| `src/routes/` | Auth, workspaces, channels, DMs |
| `src/socket/` | Frames, rooms, Redis bus, heartbeats |
| `src/services/` | Sessions, channel access, the one message write path |
| `prisma/` | Schema and migrations |

Route list: [HTTP and WebSocket API](../../docs/api.md).
