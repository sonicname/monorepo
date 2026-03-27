# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pnpm monorepo (v10.32.1) with three apps and seven shared packages. Traefik reverse proxy routes all browser traffic: `/api/auth` → auth service (no JWT), `/api` → API (JWT via forwardAuth), `/` → web SSR.

## Commands

```bash
# Install (also builds all packages via postinstall)
pnpm install

# Development — all apps + package watcher
pnpm dev

# Individual apps
pnpm dev:web              # React Router v7 SSR on :5173
pnpm dev:api              # NestJS API on :3001
pnpm --filter auth dev    # NestJS Auth on :3002 + gRPC :5001

# Build
pnpm build                # packages → web → api
pnpm run build:packages   # shared packages only (must quote the glob)

# Type checking
pnpm typecheck            # all packages + apps

# Tests (api only)
pnpm test                 # unit tests (Jest)
pnpm test:e2e             # e2e tests
pnpm --filter api test -- --testPathPattern=<pattern>  # single test file

# Format (api only)
pnpm format               # Prettier: singleQuote, trailingComma "all"

# Database (Drizzle ORM, two separate databases)
pnpm db:push:auth         # push auth schema (monorepo_auth)
pnpm db:push:api          # push api schema (monorepo_api)
pnpm db:generate:auth     # generate auth migrations
pnpm db:generate:api      # generate api migrations
pnpm db:migrate:auth      # run auth migrations
pnpm db:migrate:api       # run api migrations
pnpm db:studio:auth       # Drizzle Studio for auth
pnpm db:studio:api        # Drizzle Studio for api

# Package generator
pnpm gen:package <name> [--dep pkg@ver] [--workspace-dep name] [--export subpath] [--with-test]
```

## Architecture

### Apps

- **`apps/web`** — React Router v7 with SSR (Vite, Tailwind v4). Module: `ES2022`/`bundler`. Path alias `~/*` → `./app/*`.
- **`apps/auth`** — NestJS auth microservice. HTTP on `:3002`, gRPC server on `:5001`. Handles registration, login, JWT issuance, and token verification. Reads `AUTH_DATABASE_URL` → `monorepo_auth` database.
- **`apps/api`** — NestJS API server on `:3001`. Uses BullMQ (Redis), RabbitMQ, gRPC client to auth. Reads `API_DATABASE_URL` → `monorepo_api` database. Protected by Traefik forwardAuth (JWT verified by auth service, user info forwarded as `X-User-*` headers).

### Packages

- **`@monorepo/config`** — Env/config helpers (`getApiPort()`, `getAuthGrpcUrl()`, etc.)
- **`@monorepo/constants`** — Queue names, BullMQ defaults, event constants
- **`@monorepo/contracts`** — Shared TypeScript types/interfaces for apps
- **`@monorepo/database`** — Drizzle ORM. Two sub-path exports: `@monorepo/database/auth` (users schema/repo) and `@monorepo/database/api` (projects schema/repo). Separate Drizzle configs: `drizzle.auth.config.ts`, `drizzle.api.config.ts`
- **`@monorepo/proto`** — Protobuf definitions (`proto/auth.proto`), TypeScript interfaces, `getAuthProtoPath()` helper
- **`@monorepo/cache`** — Redis cache helpers via `ioredis`. Provides `createRedisClient(env)`, and JSON-serialised cache operations (`cacheGet`, `cacheSet`, `cacheDel`, `cacheExists`, `cacheExpire`, `cacheTtl`)
- **`@monorepo/queues`** — BullMQ and RabbitMQ helpers. Sub-path exports: `@monorepo/queues/bullmq`, `@monorepo/queues/rabbitmq`

### Key Patterns

- **NestJS apps** use `module: "nodenext"` / `moduleResolution: "nodenext"` with `emitDecoratorMetadata: true`
- **Packages** use `module: "ES2022"` / `moduleResolution: "bundler"`, output to `dist/`
- **`DatabaseModule` and `RuntimeConfigModule`** are `@Global()` in both api and auth — no need to import in feature modules
- **`isolatedModules` + `emitDecoratorMetadata` gotcha**: NestJS interfaces (e.g., `ClientGrpc`) can't be used directly as typed constructor params. Use `object` type + cast in `onModuleInit`, or `import type` + separate variable
- **Build order matters**: packages must build before apps. `pnpm dev` handles this automatically
- **`pnpm run build:packages`** must use quoted glob internally (`pnpm -r --filter './packages/*' build`). The root script handles this, but if running manually, quote the filter

### Docker

```bash
# Dev stack (Postgres, Redis, RabbitMQ, Traefik, all apps)
docker compose -f docker-compose.dev.yml up --build

# Postgres auto-creates both databases via docker/postgres-init.sql
```

### gRPC Testing

```bash
grpcurl -plaintext -proto packages/proto/proto/auth.proto \
  -d '{"token":"<jwt>"}' localhost:5001 auth.AuthService/VerifyToken
```
