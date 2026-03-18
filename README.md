# Monorepo Boilerplate

PNPM workspace with two Node.js applications:

- `apps/web`: React Router v7 framework app with server-side rendering
- `apps/api`: NestJS API server
- `packages/config`: shared env/config helpers for ports, origins, and API paths
- `packages/constants`: shared queue names, BullMQ defaults, and event constants
- `packages/contracts`: shared TypeScript contracts consumed by both apps
- `packages/queue`: shared BullMQ/Redis helpers consumed by both apps

## Requirements

- Node.js 24+
- pnpm 10+

## Install

```bash
pnpm install
```

The shared workspace packages build to `dist/` and root install runs that build automatically.

Example environment files are provided in:

- `apps/web/.env.example`
- `apps/api/.env.example`

## Development

Run both apps together:

```bash
pnpm dev
```

This builds the shared workspace packages first, then watches them while the apps run.

Run the full dev stack with Docker Compose:

```bash
docker compose -f docker-compose.dev.yml up --build
```

This starts:

- `web` on <http://localhost:5173>
- `api` on <http://localhost:3001>
- `redis` on <http://localhost:6379>

Stop the stack with:

```bash
docker compose -f docker-compose.dev.yml down
```

App URLs:

- Web: <http://localhost:5173>
- API: <http://localhost:3001>

The SSR home route calls the Nest API health endpoint during its loader.

- Health endpoint: <http://localhost:3001/health>
- Projects endpoint: <http://localhost:3001/api/projects>
- Queue status endpoint: <http://localhost:3001/api/projects/queue>
- Optional server-side override: set `API_URL` before starting the web app
- Optional shared env values: `WEB_PORT`, `API_PORT`, `WEB_URL`, `API_URL`, `PUBLIC_API_BASE_PATH`, `REDIS_URL`, `BULLMQ_ENABLED`, `BULLMQ_PREFIX`
- Shared response type: `ApiHealth` from `@monorepo/contracts`

Example:

```bash
API_URL=http://127.0.0.1:3001 pnpm dev:web
```

The shared config package exports helpers used by both apps:

- `getWebPort()` and `getApiPort()`
- `getWebOrigin()` and `getApiOrigin()`
- `getPublicApiBasePath()`, `getHealthUrl()`, and `getProjectsUrl()`
- `getRedisUrl()`, `isBullMqEnabled()`, `getBullMqPrefix()`, and `getProjectsQueueName()`

BullMQ usage in this starter:

- The web app can enqueue a projects sync job from the SSR route
- The API app uses `@nestjs/bullmq` for the worker integration and exposes queue status at `/api/projects/queue`
- Queue names, BullMQ retry/backoff defaults, cleanup policy, and worker event names live in `@monorepo/constants`

Run one app at a time:

```bash
pnpm dev:web
pnpm dev:api
```

## Production

Build both apps:

```bash
pnpm build
```

If you only need the shared workspace packages rebuilt, run:

```bash
pnpm run build:packages
```

Start both production servers:

```bash
pnpm start
```

Default production ports:

- Web: <http://localhost:3000>
- API: <http://localhost:3001>

## Other Scripts

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm format
```
