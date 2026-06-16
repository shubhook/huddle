FROM oven/bun:1.3.13

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN bun install --frozen-lockfile

COPY apps/server/ ./apps/server/

WORKDIR /app/apps/server

RUN bunx prisma generate

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]