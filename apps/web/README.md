# `@huddle/web`

React client for Huddle.

> Hash-routed UI on Bun. Talks to the API over HTTP and WebSocket.

## Stack

| Piece | Choice |
| --- | --- |
| Runtime | Bun |
| UI | React 19 |
| Styling | Tailwind v4 |
| Routing | `window.location.hash` |
| HTTP | axios (`withCredentials`) |
| Realtime | browser `WebSocket` via `src/lib/ws.ts` |

## Run

From this directory (or via root `bun run dev:web`):

```bash
bun install
bun --hot src/index.ts
```

| Process | Default |
| --- | --- |
| Web | `http://localhost:3008` |
| API it expects | `http://localhost:3000` |

### Env

| Variable | Purpose |
| --- | --- |
| `BUN_PUBLIC_API_URL` | API origin. Defaults to `http://localhost:3000`. |

The WebSocket URL is derived by swapping `http` → `ws` on that value.

## Screens

| Route | Screen |
| --- | --- |
| `#/` | Landing |
| `#/signin` | Sign in |
| `#/signup` | Sign up |
| `#/join` | Join workspace by invite |
| `#/workspace/create` | Create workspace + invite step |
| `#/app` | Dashboard (channels + live chat) |

## Chat wiring

| Step | Where |
| --- | --- |
| Load channels | `GET /workspaces/:id` |
| Load history | `GET /channels/:id/messages` |
| Open socket | `connectSocket()` in `src/lib/ws.ts` |
| Join room | `join_channel` when status is `connected` |
| Send | `send_message` over the socket |

Connection status shows in `ConnectionBadge`. The composer does not yet disable itself when the socket is down.

## Known gaps

| Gap | Effect |
| --- | --- |
| `workspaceId` is React state only | Refresh on `#/app` loses the workspace and never reconnects the socket |
| No default channel on create | New workspace can have an empty sidebar |
| No reconnect | Close leaves status `disconnected` until remount |
| Dead chrome | Search, info, formatting toolbar, and some landing CTAs do nothing yet |

## Scripts

| Command | What it does |
| --- | --- |
| `bun --hot src/index.ts` | Dev server with HMR |
| `bun run build` | Production build via `build.ts` |
| `bun start` | Serve production build |
