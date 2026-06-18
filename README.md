# Huddle

A real-time team messaging platform built out of curosity.

## What it is

Huddle is a backend-heavy chat application that implements the core infrastructure behind tools like Slack — WebSockets, Redis pub/sub, presence tracking, and a multi-service containerized architecture.

## Stack

- **Runtime:** Bun + TypeScript
- **Framework:** Express 5
- **Database:** PostgreSQL via Prisma
- **Cache / Pub-Sub:** Redis
- **Infra:** Docker Compose, DigitalOcean, Caddy

## Features

- JWT + GitHub OAuth authentication
- Multi-tenant workspaces with invite system
- Public channels with real-time messaging via WebSockets
- Direct messages between workspace members
- Online/offline presence tracking
- Cursor-based pagination for message history
- Redis pub/sub for horizontal scaling

## Run locally

```bash
docker compose up --build
```

## Status

Work in progress.