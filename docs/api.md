# HTTP and WebSocket API

Base URL in dev: `http://localhost:3000`. Cookie: `jwt_token`. CORS allows `CLIENT_ORIGIN` with credentials.

Unless noted, routes need a valid session.

## Health

```http
GET /health
```

`200` `{ "status": "ok" }`. No auth.

## Auth

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/signup` | no | Rate limited: 10 / hour / IP |
| POST | `/auth/signin` | no | Rate limited: 30 / 15 min / IP and 10 / 15 min / account |
| GET | `/auth/me` | yes | `{ user: { id, username, email } }` |
| POST | `/auth/logout` | cookie optional | Revokes if present, always clears cookie |
| GET | `/auth/github` | no | 503 if OAuth env is missing |
| GET | `/auth/github/callback` | no | Redirects to the web app |
| GET | `/auth/sessions` | yes | Active sessions, `current: true` on the caller |
| DELETE | `/auth/sessions/:id` | yes | Own sessions only |
| POST | `/auth/sessions/revoke-all` | yes | Body `{ keepCurrent?: boolean }` |

Signup body: `{ username, email, password }`. Sign-in body: `{ email, password }`.

## Workspaces

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/workspaces` | Workspaces the caller belongs to |
| POST | `/workspaces` | `{ name }`. Caller becomes owner, `#general` is created |
| GET | `/workspaces/:id` | Name, channels, members |
| POST | `/workspaces/:id/invite` | Owner. Returns `{ token }`. 20 / hour / user |
| GET | `/workspaces/:id/invites` | Owner. No tokens in the list |
| DELETE | `/workspaces/:id/invites/:inviteId` | Owner |
| POST | `/workspaces/join/:token` | 20 / hour / user, 60 / hour / IP |

## Channels and messages

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/workspaces/:id/channels` | `{ name }`. All current members are added |
| GET | `/workspaces/:id/channels` | |
| GET | `/channels/:id/messages` | Newest 50. `?cursor=<messageId>` for the next page |
| POST | `/channel/:id/messages` | Singular. `{ content }`. Fans out over the socket |

The singular/plural split on send vs history is real. The web UI uses the socket for send and REST for history.

## Direct messages

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/dm/:userId` | Query `workspaceId` required, optional `cursor`. Newest 50 |
| POST | `/dm/:userId` | `{ content, workspaceId }` |

Both people must be in that workspace. Not used by the SPA. Does not fan out on the socket.

## WebSocket

URL: same host as HTTP, `ws:` / `wss:` matching the page. Cookie on upgrade.

Client frames and server frames are listed in [realtime](./realtime.md). Maximum frame 16 KB. Message content max 4000 characters.

Error frames look like:

```json
{ "type": "error", "code": "channel_not_found", "message": "Channel not found", "clientMessageId": "…" }
```

`code` values you will actually see: Zod failures, `channel_not_found`, `forbidden`, `not_supported`, plus join/send membership failures from `channel-access.ts`.
