# Deploy

Huddle is two origins on purpose. The web app is static files. The API is a long-lived Node/Bun process with a WebSocket on the same port. Vercel can host the files. It cannot host that socket. Putting both on Vercel, or swapping the cookie session for Supabase Auth, would be a rewrite.

This is how the running instance is set up. Local setup stays in [setup](./setup.md).

## What is live

| Piece | Where | Why |
| --- | --- | --- |
| Web | [Vercel](https://chatonhuddle.vercel.app), `apps/web/dist` | Hash-routed SPA. No server of its own |
| API + WebSocket | Coolify on the Oracle Cloud VPS, `apps/server` Docker image | Same HTTP server as `ws`. Needs a process that stays up |
| Postgres | Supabase | Prisma talks to ordinary Postgres. Supabase Auth and Realtime are unused |

The first public API hostname was a Cloudflare quick tunnel in front of Coolify, so the Vercel app had HTTPS to talk to. Those `*.trycloudflare.com` names change when the tunnel restarts. A Coolify domain, or a named Cloudflare tunnel, is what belongs in Vercel env for anything that should survive a reboot.

Web origin: `https://chatonhuddle.vercel.app`.

## Why it is split this way

The login cookie is `httpOnly` on the API host. Axios and the browser WebSocket both attach it because they talk to that host, not to Vercel. Production therefore has two origins, `SameSite=None; Secure` cookies, and `CLIENT_ORIGIN` listing the Vercel URL.

Supabase here is a hosted Postgres. The app still owns sessions, CSRF, and the socket. Pointing signup at Supabase Auth would throw that away.

Redis is optional. One Coolify replica does not need it. Set `REDIS_URL` only if you run more than one API process.

## Web on Vercel

`vercel.json` at the repo root:

- install: `bun install --frozen-lockfile`
- build: `cd apps/web && bun run build`
- output: `apps/web/dist`
- headers: `nosniff`, `DENY` framing, `no-referrer`

Hash routes (`#/app/...`) never hit the server, so there are no SPA rewrites.

`apps/web/build.ts` must pass `env: "BUN_PUBLIC_*"` into `Bun.build`. The dev server already does this through `bunfig.toml`. The production build did not, which is why the first Vercel deploy called `http://localhost:3000` in the visitor's browser. That bug is [PR #14](https://github.com/shubhook/huddle/pull/14).

### Vercel env

Set these on the project. They are inlined at **build** time, not read in the browser.

| Variable | Value |
| --- | --- |
| `BUN_PUBLIC_API_URL` | API origin, `https://...`, no trailing slash |
| `BUN_PUBLIC_WS_URL` | Optional. Default is the API URL with `https` swapped for `wss` |

Change the API hostname, then redeploy the web app. An old bundle still points at the old host.

First ship used the Vercel CLI from the branch that contained the `build.ts` fix. Git integration on `main` is fine after that commit. Connecting Git before it would have published the localhost bundle again.

## API on Coolify

Coolify builds `apps/server/Dockerfile` with the **repo root** as context. The image runs `prisma migrate deploy`, then `src/index.ts`. Listen port is `3000`. The proxy in front must forward WebSocket upgrades, not only HTTP.

Do not start the Compose `postgres` or `redis` services on the VPS for this deploy. Postgres is Supabase. Redis is unused until you add a second replica. Compose still binds those ports to `127.0.0.1` if you do run them; do not publish them on `0.0.0.0`.

### API env

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production`. A short or example `JWT_SECRET` then refuses to boot |
| `JWT_SECRET` | 32+ random characters. `openssl rand -base64 48` |
| `DATABASE_URL` | Supabase Postgres URI. The container migrates on boot, so this URL must allow `prisma migrate deploy`, not only a transaction pooler |
| `CLIENT_ORIGIN` | `https://chatonhuddle.vercel.app` |
| `COOKIE_SECURE` | `true`. Sets `SameSite=None; Secure` so the Vercel origin can send the cookie |
| `TRUST_PROXY` | Hop count, never `true`. One reverse proxy is `1`. Cloudflare tunnel plus Coolify's Traefik is `2`. Wrong value either lumps every visitor onto one IP for rate limits, or trusts a client-supplied `X-Forwarded-For` |
| `PORT` | `3000` unless the platform injects another |
| `REDIS_URL` | Leave unset on a single replica |
| `RATE_LIMIT_DISABLED` | Must stay unset |
| `CLIENT_ID` / `CLIENT_SECRET` / `GITHUB_REDIRECT_URI` | Optional. Callback is `https://<api-host>/auth/github/callback` |

`CLIENT_ORIGIN` is also the CSRF allow list and the WebSocket Origin check. A preview deployment on another Vercel hostname gets 403 on POST until you add it.

### Oracle box

Coolify is running on the Oracle Cloud free-tier VPS. Ampere A1 has enough RAM for Coolify itself. A 1 GB micro does not.

Oracle has two firewalls. Open 80/443 on the network security group **and** on the instance iptables/firewalld, or the proxy never sees traffic. A reserved public IP survives a stop. Let's Encrypt wants a real domain pointing at that IP. The Cloudflare quick tunnel was the stand-in until that exists.

## Cookies, CORS, and the socket

Read [auth](./auth.md) and [security](./security.md) for the code. The production checklist is short:

1. Web is `https://chatonhuddle.vercel.app`. API is another HTTPS origin.
2. `COOKIE_SECURE=true` so the cookie is `None` + `Secure`.
3. `CLIENT_ORIGIN` lists the Vercel origin exactly, scheme and host, no path.
4. The proxy upgrades `/` for `ws`. Heartbeats are 30s. Idle proxies that kill connections at 15s will look like a flapping socket.

A sign-in that "works" and then dumps you back on `#/signin` is almost always the cookie not being stored or not being sent cross-site. Firefox is the picky one.

## Ship a change

**Web.** Push to `main`. Vercel rebuilds `apps/web`. Confirm `BUN_PUBLIC_API_URL` is still the live API. Then open the site, sign in, and send a message.

**API.** Coolify rebuilds the Dockerfile. Boot runs pending Prisma migrations, then the server. A migration that fails keeps the old container from being replaced only if Coolify is set to not start an unhealthy deploy. Watch the first logs for `JWT_SECRET is too weak` or a Prisma connection error.

**Schema.** The API image migrates itself. You do not run `bun run db:migrate` against production from a laptop unless you are debugging that boot step.

## Smoke check

```bash
curl -sS https://<api-host>/health
# {"status":"ok"}
```

Then in a browser on `https://chatonhuddle.vercel.app`:

1. Create an account.
2. Confirm `jwt_token` is on the **API** host, `Secure`, `None`.
3. Create a workspace and a channel.
4. Send a message. It should persist in Supabase and arrive on the socket.

If the Network tab shows `GET http://localhost:3000/workspaces`, the Vercel build did not inline `BUN_PUBLIC_API_URL`. Redeploy after setting it.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Bundle calls `localhost:3000` | `BUN_PUBLIC_*` missing on Vercel, or an old build from before `env: "BUN_PUBLIC_*"` in `build.ts` |
| Sign-in 200, then still signed out | `COOKIE_SECURE` false on HTTPS, or `CLIENT_ORIGIN` missing the Vercel origin |
| POST 403 | Origin not in `CLIENT_ORIGIN`. Preview URLs are different hosts |
| Socket connects then drops | Proxy not upgrading WebSocket, or Origin check failing |
| Every login is 429 | `TRUST_PROXY` unset behind Coolify, so every client shares the proxy IP |
| API never starts | `JWT_SECRET` too short under `NODE_ENV=production`, or `DATABASE_URL` cannot migrate |
| Tunnel URL dies overnight | Cloudflare quick tunnel restarted. Update Coolify/Vercel to a stable hostname |
