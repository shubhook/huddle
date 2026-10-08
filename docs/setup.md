# Setup

Huddle is two processes: an API on port 3000 and a web app on port 3008. Postgres is required. Redis is optional and only needed if you run more than one API process.

## What you need

- [Bun](https://bun.sh)
- Docker, for Postgres (and Redis / the API image if you use them)

## Local development (source)

```bash
git clone https://github.com/shubhook/huddle.git
cd huddle
bun install
cp apps/server/.env.example apps/server/.env
```

`apps/web/.env` is optional. Defaults already point at `http://localhost:3000`.

### Env

Edit `apps/server/.env`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | yes | Signs the login token. Use 32+ random characters (`openssl rand -base64 48`). With `NODE_ENV=production` the server refuses to start on a short or example value |
| `DATABASE_URL` | yes | Postgres. Match Compose defaults unless you changed them |
| `PORT` | no | API port, default `3000` |
| `CLIENT_ORIGIN` | no | Credentialed CORS origins, default `http://localhost:3008,http://127.0.0.1:3008` |
| `COOKIE_SECURE` | no | `true` only on HTTPS |
| `REDIS_URL` | no | Share realtime events and rate-limit counters between API processes. Compose Redis uses a password: `redis://:huddle@localhost:6379`. Inside Compose the API gets the right URL automatically |
| `TRUST_PROXY` | no | Number of reverse proxies in front of the API, usually `1`. Needed so rate limits see each client's IP. Never `true` |
| `RATE_LIMIT_DISABLED` | no | Testing only. Turns off login, signup, and invite limits |
| `WS_HEARTBEAT_MS` | no | Ping interval, default `30000`. A socket with no pong after one interval is closed |
| `WS_MEMBERSHIP_RECHECK_MS` | no | How often subscribed users are re-checked against channel membership, default `60000` |
| `CLIENT_ID` / `CLIENT_SECRET` / `GITHUB_REDIRECT_URI` | no | GitHub OAuth. Omit for email and password only |

Web (`apps/web/.env`):

| Variable | Purpose |
| --- | --- |
| `BUN_PUBLIC_API_URL` | API origin, default `http://localhost:3000` |
| `BUN_PUBLIC_WS_URL` | Optional WS override. Otherwise `http` becomes `ws` on the API URL |

Use either `localhost` or `127.0.0.1` everywhere: the browser, `CLIENT_ORIGIN`, and `BUN_PUBLIC_API_URL`. Mixing them breaks cookies.

### Postgres

```bash
# Postgres only. Add redis to the command if you set REDIS_URL.
docker compose up postgres -d
```

Compose defaults: user / password / db `huddle`, port `5432`. Postgres and Redis are published on `127.0.0.1` only, so nothing outside your machine can reach them.

Set `POSTGRES_PASSWORD` and `REDIS_PASSWORD` (letters and digits only, they go into connection URLs) anywhere beyond a laptop. The Postgres password only applies when its data volume is first created. An existing volume keeps the old one.

```bash
bun run db:generate
bun run db:migrate
```

Run those two again after you pull, if the Prisma schema changed.

### Start API + web

```bash
# from repo root. API :3000, web :3008
bun run dev
```

Or separately:

```bash
bun run dev:server
bun run dev:web
```

| Process | Default URL |
| --- | --- |
| API + WebSocket | `http://localhost:3000` (`ws://localhost:3000`) |
| Web | `http://localhost:3008` |

Open [http://localhost:3008](http://localhost:3008), create an account, make a workspace, open a channel.

## Smoke check

```bash
curl -s http://localhost:3000/health
# {"status":"ok"}

curl -s -c /tmp/huddle.jar -H 'Content-Type: application/json' \
  -d '{"username":"demo","email":"demo@example.com","password":"password123"}' \
  http://localhost:3000/auth/signup

curl -s -b /tmp/huddle.jar http://localhost:3000/auth/me
```

History loads over REST (`GET /channels/:id/messages`). Live sends use the WebSocket (`join_channel` / `send_message`). The browser attaches the `jwt_token` cookie on upgrade.

## Tests

Postgres has to be up and migrated. Redis does not.

```bash
bun test
```

The suite starts the API on a random port and opens two WebSocket clients against it. It also checks the per-socket queue, membership and session rechecks, and that a publish still lands in this process when Redis is down.

## API in Docker

```bash
docker compose up --build
```

`--build` matters. Compose bakes the API into an image. `docker compose up` without it reuses whatever was last built, which is why a current web app talking to an old API returns `Cannot GET /workspaces` after sign-in.

Needs a filled `apps/server/.env`. Starts API, Postgres, and Redis. The container runs `prisma migrate deploy` on boot, then `src/index.ts`. Web is not a Compose service. Still run `bun run dev:web`.

Inside Compose, `DATABASE_URL` and `REDIS_URL` are overridden to the `postgres` and `redis` hostnames. Do not point those at `localhost` in the container.

## GitHub OAuth

Leave `CLIENT_ID` and `CLIENT_SECRET` blank for email and password only. To turn GitHub on, create an OAuth App with callback `http://localhost:3000/auth/github/callback` (or your `GITHUB_REDIRECT_URI`) and fill those two values.

The server asks for `read:user` and `user:email`. It matches on GitHub's numeric user id, never on email alone. Details in [auth](./auth.md).

## After a pull

```bash
bun install
bun run db:generate
bun run db:migrate
```

If the API runs in Docker, rebuild it:

```bash
docker compose up --build -d api
```

Tokens issued before the Session table existed have no `sid` and are rejected. Everyone signs in once after that upgrade.

## Production

Local Compose is not what is live. Web is Vercel, the API is Coolify, Postgres is Supabase. [Deploy](./deploy.md).

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Blank `#/app` after sign-in, network 404 on `GET /workspaces` | API Docker image is stale. Rebuild with `--build` |
| Sign-in works, cookie never sent | Browser used `127.0.0.1` while env says `localhost`, or the other way around |
| GitHub sign-in bounces back to `#/signin` | Cookie `SameSite`. Local HTTP is `Lax` and works same-site on localhost. Production needs `COOKIE_SECURE=true` |
| `JWT_SECRET is too weak` and the process exits | Production refuses a short or example secret. Generate one with `openssl rand -base64 48` |
| Rate limit 429 on login | 30 attempts / 15 min per IP and 10 / 15 min per account. Wait, or set `RATE_LIMIT_DISABLED=true` only on a laptop |
