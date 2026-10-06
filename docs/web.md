# Web client

`apps/web` is a Bun-served React app. It has no backend of its own. Hash routes pick the screen. Axios and the browser WebSocket talk to the API.

Dev server: `bun --hot src/index.ts` on port 3008. `/*` serves `index.html`. Production build is `bun run build` then `bun start`.

## Routes

`apps/web/src/lib/hashRoute.ts`. `window.location.hash` is the source of truth.

| Hash | Screen |
| --- | --- |
| `#/` | Landing |
| `#/signin` | Sign in. `#/signin/<code>` is a GitHub failure |
| `#/signup` | Sign up |
| `#/join/<token>` | Join workspace. Signed-out users are sent to sign-in with the token kept in `sessionStorage` |
| `#/workspace/create` | Name a workspace, then copy an invite link |
| `#/app` or `#/app/<workspaceId>` | Dashboard |

Unknown hashes fall through to landing.

`#/app` without a workspace id lists workspaces and replaces the URL with the first one, or sends you to create. Refresh keeps `#/app/<id>`.

Use `localhost` or `127.0.0.1` the same way the API's `CLIENT_ORIGIN` is set. The cookie is bound to the API host. Mixing them looks like "sign-in did nothing."

## Env

Bun inlines `BUN_PUBLIC_*` at bundle time. Unset variables are not inlined, so the client reads them behind try/catch (`apps/web/src/lib/api.ts`, `ws.ts`). A bare `process.env.BUN_PUBLIC_WS_URL` in the browser throws and takes the dashboard down.

The production build must pass `env: "BUN_PUBLIC_*"` to `Bun.build`. Without it the Vercel bundle falls back to `http://localhost:3000`. Vercel env is therefore a build-time setting. Change the API host, then rebuild. See [deploy](./deploy.md).

| Variable | Default |
| --- | --- |
| `BUN_PUBLIC_API_URL` | `http://localhost:3000` |
| `BUN_PUBLIC_WS_URL` | `http` → `ws` on the API URL |

## Chat wiring

`DashboardPage` owns the live room.

| Step | Where |
| --- | --- |
| Load workspace | `GET /workspaces/:id` |
| Open socket | `connectSocket()` in `lib/ws.ts` |
| Join room | `join_channel` when status is `connected` |
| Load history | `GET /channels/:id/messages` after the join ack |
| Send | `send_message` with a `clientMessageId`. Pending until `send_message_ack` or 10 s |

Incoming `new_message` and REST history merge by id, newest copy wins, sorted by `createdAt`. The composer still accepts input when the socket is down. The send just does not leave the machine.

Connection status is the badge in the sidebar (`connecting` / `connected` / `disconnected`). Close code 4401, or a reconnect that gets 401 from `/auth/me`, clears the session and the app sends you to sign-in.

## Screens that are not the dashboard

Landing is marketing plus a canned `LiveDemo` that does not hit the API.

Sign-in and sign-up post to `/auth/*` and then either `#/app` or `#/workspace/create`. GitHub is a full-page redirect to `${API}/auth/github`.

Workspace setup creates the workspace, then tries `POST /workspaces/:id/invite` so you can copy `#/join/<token>` before you enter the room.

## Gaps in the UI

| Gap | Effect |
| --- | --- |
| History cursor | Server returns `nextCursor`. The client never sends it |
| Session list | API exists, no screen |
| DMs | Copy in the sidebar says they are coming. They are |
| Invite from dashboard | Works. Join from a signed-out tab works if you sign in before the token is dropped |
