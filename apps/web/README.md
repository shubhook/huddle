# `@huddle/web`

React client for Huddle. Hash-routed UI on Bun. Talks to the API over HTTP and WebSocket.

How it works: [web client](../../docs/web.md). How to run the whole app: [setup](../../docs/setup.md).

## Run

From repo root (`bun run dev:web`) or this directory:

```bash
cp .env.example .env   # optional
bun --hot src/index.ts
```

| Process | Default |
| --- | --- |
| Web | `http://localhost:3008` |
| API it expects | `http://localhost:3000` |

Cookies are set by the API host. Open the UI with the same hostname you put in `CLIENT_ORIGIN` / `BUN_PUBLIC_API_URL` (`localhost` vs `127.0.0.1`).

| Variable | Purpose |
| --- | --- |
| `BUN_PUBLIC_API_URL` | API origin, default `http://localhost:3000` |
| `BUN_PUBLIC_WS_URL` | Optional. Otherwise `http` → `ws` on the API URL |

## Screens

| Route | Screen |
| --- | --- |
| `#/` | Landing |
| `#/signin` | Sign in |
| `#/signup` | Sign up |
| `#/join/<token>` | Join workspace |
| `#/workspace/create` | Create workspace |
| `#/app/<workspaceId>` | Dashboard |

## Scripts

| Command | What it does |
| --- | --- |
| `bun --hot src/index.ts` | Dev server with HMR |
| `bun run build` | Production build via `build.ts` |
| `bun start` | Serve production build |
