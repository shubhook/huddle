# Docs

How Huddle is put together, and how to run it. The root [README](../README.md) is the short version.

| Page | What it covers |
| --- | --- |
| [Setup](./setup.md) | Clone, env, Postgres, migrations, Compose, smoke check |
| [Deploy](./deploy.md) | Vercel web, Coolify API, Supabase Postgres. What is live |
| [Architecture](./architecture.md) | How the API, socket, web, and Postgres fit |
| [Auth and sessions](./auth.md) | Cookies, JWT + Session rows, GitHub OAuth, logout |
| [Workspaces and channels](./workspaces.md) | Membership, invites, channels, who can do what |
| [Realtime](./realtime.md) | WebSocket frames, Redis bus, reconnect, membership checks |
| [Web client](./web.md) | Hash routes, how the dashboard talks to the API |
| [HTTP and WebSocket API](./api.md) | Routes and frame types |
| [Security](./security.md) | CSRF origin check, rate limits, headers, known gaps |

Read [realtime](./realtime.md) first if you came here for the WebSocket. That is the point of the repo.
