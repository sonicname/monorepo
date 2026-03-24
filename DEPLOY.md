# Deployment Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Development](#development)
  - [Local (no Docker)](#local-no-docker)
  - [Docker Compose Dev Stack](#docker-compose-dev-stack)
- [Database Migrations](#database-migrations)
- [Production](#production)
  - [Build Docker Images](#build-docker-images)
  - [Secrets Checklist](#secrets-checklist)
  - [Docker Compose Production Stack](#docker-compose-production-stack)
  - [Deploy with a Registry](#deploy-with-a-registry)
- [Traefik HTTPS Notes](#traefik-https-notes)
- [Healthchecks & Readiness](#healthchecks--readiness)

---

## Prerequisites

| Tool | Min version |
| --- | --- |
| Node.js | 24+ |
| pnpm | 10+ |
| Docker | 27+ |
| Docker Compose | v2 (plugin) |

---

## Environment Variables

Copy the example files before starting:

```bash
cp apps/auth/.env.example    apps/auth/.env
cp apps/api/.env.example     apps/api/.env
cp apps/web/.env.example     apps/web/.env
cp packages/database/.env.example packages/database/.env
```

### `apps/auth`

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `AUTH_PORT` | No | `3002` | Port the auth service listens on |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | `change-me-in-production` | Secret used to sign and verify JWTs. **Must match across services.** |

### `apps/api`

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `API_PORT` | No | `3001` | Port the API service listens on |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | Yes (if BullMQ) | — | Redis connection string |
| `RABBITMQ_URL` | Yes (if RabbitMQ) | — | RabbitMQ AMQP connection string |
| `BULLMQ_ENABLED` | No | `false` | Enable BullMQ worker |
| `RABBITMQ_ENABLED` | No | `false` | Enable RabbitMQ microservice transport |
| `BULLMQ_PREFIX` | No | `monorepo` | Key prefix for BullMQ jobs |
| `PUBLIC_API_BASE_PATH` | No | `/api` | Base path prefix for all API routes |

### `apps/web`

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `WEB_PORT` | No | `5173` (dev) / `3000` (prod) | Port the web server listens on |
| `API_URL` | No | `http://127.0.0.1:3001` | API origin for SSR fetch calls |
| `AUTH_SERVICE_URL` | No | `http://127.0.0.1:3002` | Auth service origin for SSR login/register (bypasses Traefik) |
| `SESSION_SECRET` | Yes | `change-me-in-production` | Secret used to sign the session cookie |
| `PUBLIC_API_BASE_PATH` | No | `/api` | Base path used by shared config helpers |

### Generate secrets

```bash
# JWT_SECRET
openssl rand -hex 32

# SESSION_SECRET
openssl rand -hex 32

# POSTGRES_PASSWORD
openssl rand -base64 24

# REDIS_PASSWORD
openssl rand -hex 20

# RABBITMQ_PASSWORD
openssl rand -hex 20
```

---

## Development

### Local (no Docker)

Start the infrastructure (PostgreSQL, Redis, RabbitMQ) separately, then:

```bash
# Install dependencies
pnpm install

# Run database migrations (first time or after schema changes)
pnpm run db:push

# Run all apps with package watching
pnpm dev
```

Run individual apps:

```bash
pnpm dev:web   # React Router SSR on :5173
pnpm dev:api   # NestJS API on :3001
pnpm --filter auth dev  # NestJS Auth on :3002
```

### Docker Compose Dev Stack

The dev stack mounts the source tree into each container and runs apps in watch mode. First-run compilation takes a few minutes.

```bash
docker compose -f docker-compose.dev.yml up --build
```

Services available after startup:

| Service | URL |
| --- | --- |
| Web (via Traefik) | <http://localhost> |
| Web (direct) | <http://localhost:5173> |
| API (direct) | <http://localhost:3001> |
| Auth (direct) | <http://localhost:3002> |
| Traefik dashboard | <http://localhost:8080> |
| RabbitMQ management | <http://localhost:15672> |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

Stop the stack:

```bash
docker compose -f docker-compose.dev.yml down
```

Remove all volumes (full reset):

```bash
docker compose -f docker-compose.dev.yml down -v
```

---

## Database Migrations

Drizzle ORM manages the schema. Run migrations from the repo root (requires `DATABASE_URL` in `packages/database/.env` or the environment).

```bash
# Generate a new migration from schema changes
pnpm run db:generate

# Apply pending migrations
pnpm run db:migrate

# Push schema directly without migration files (dev / CI only)
pnpm run db:push

# Open Drizzle Studio (browser UI)
pnpm run db:studio
```

> **Production:** always use `db:migrate`, never `db:push`.

The migration runner can be wired into CI or run as an init container before starting the API and auth services. The connection string is read from `DATABASE_URL`.

---

## Production

### Build Docker Images

All Dockerfiles use the **monorepo root** as build context and handle workspace dependency resolution via `pnpm deploy`.

```bash
docker build -f apps/auth/Dockerfile -t monorepo-auth:latest .
docker build -f apps/api/Dockerfile  -t monorepo-api:latest  .
docker build -f apps/web/Dockerfile  -t monorepo-web:latest  .
```

Build all in parallel:

```bash
docker build -f apps/auth/Dockerfile -t monorepo-auth:latest . &
docker build -f apps/api/Dockerfile  -t monorepo-api:latest  . &
docker build -f apps/web/Dockerfile  -t monorepo-web:latest  . &
wait
```

Tag with a specific version:

```bash
TAG=1.2.3
docker build -f apps/auth/Dockerfile -t monorepo-auth:$TAG -t monorepo-auth:latest .
```

### Secrets Checklist

Before running the production stack, ensure **all** of the following are set in your `.env` (or passed via your secrets manager):

```
ACME_EMAIL=         # Let's Encrypt registration email
POSTGRES_PASSWORD=  # Strong random password
REDIS_PASSWORD=     # Strong random password
RABBITMQ_USER=      # Non-default username
RABBITMQ_PASSWORD=  # Strong random password
JWT_SECRET=         # openssl rand -hex 32
SESSION_SECRET=     # openssl rand -hex 32
```

Create a `.env` file at the repo root (it is loaded automatically by Compose):

```bash
cat > .env <<'EOF'
ACME_EMAIL=ops@example.com

POSTGRES_DB=monorepo
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<generated>

REDIS_PASSWORD=<generated>

RABBITMQ_USER=monorepo
RABBITMQ_PASSWORD=<generated>

JWT_SECRET=<generated>
SESSION_SECRET=<generated>

REGISTRY=
TAG=latest
EOF
```

### Docker Compose Production Stack

Run migrations before starting the app services (requires `DATABASE_URL` pointing at the production database):

```bash
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/monorepo \
  pnpm run db:migrate
```

Start the full stack:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Rolling update (after building new images):

```bash
docker compose -f docker-compose.prod.yml pull   # if using a registry
docker compose -f docker-compose.prod.yml up -d --no-deps --build auth api web
```

Stop without removing volumes:

```bash
docker compose -f docker-compose.prod.yml down
```

### Deploy with a Registry

Push images to a registry (e.g. Docker Hub, GHCR, or a private registry):

```bash
REGISTRY=ghcr.io/your-org/
TAG=1.2.3

docker build -f apps/auth/Dockerfile -t ${REGISTRY}monorepo-auth:${TAG} .
docker build -f apps/api/Dockerfile  -t ${REGISTRY}monorepo-api:${TAG}  .
docker build -f apps/web/Dockerfile  -t ${REGISTRY}monorepo-web:${TAG}  .

docker push ${REGISTRY}monorepo-auth:${TAG}
docker push ${REGISTRY}monorepo-api:${TAG}
docker push ${REGISTRY}monorepo-web:${TAG}
```

Set `REGISTRY` and `TAG` in your `.env` on the server so `docker-compose.prod.yml` pulls the correct images.

---

## Traefik HTTPS Notes

`docker-compose.prod.yml` configures Traefik v3 with **Let's Encrypt TLS Challenge** (`tlschallenge`).

Requirements:
- Port **80** and **443** must be publicly reachable on the server.
- `ACME_EMAIL` must be a valid address for expiry notifications.
- DNS A/AAAA records must point your domain to the server **before** first boot (Let's Encrypt verifies via HTTP on port 80).

The `letsencrypt` Docker volume stores the `acme.json` certificate file. Back it up; Let's Encrypt has rate limits on certificate issuance.

HTTP traffic is automatically redirected to HTTPS via Traefik's entry-point redirect rule.

Route priority is determined by **rule length** — Traefik picks the longest matching `PathPrefix`:

| Rule | Length | Service | JWT required |
| --- | --- | --- | --- |
| `` PathPrefix(`/api/auth`) `` | 10 | auth | No |
| `` PathPrefix(`/api`) `` | 4 | api | Yes (forwardAuth) |
| `` PathPrefix(`/`) `` | 1 | web | No |

This means auth endpoints (`/api/auth/login`, `/api/auth/register`) are always public — they never pass through the `jwt-verify` middleware.

---

## Healthchecks & Readiness

| Service | Check |
| --- | --- |
| PostgreSQL | `pg_isready` via Docker healthcheck |
| Redis | `redis-cli ping` via Docker healthcheck |
| RabbitMQ | `rabbitmq-diagnostics check_port_connectivity` via Docker healthcheck |
| API | `GET /health` → `{ status: "ok" }` |
| Auth | `GET /api/auth/verify` → `401` (unauthenticated) or `200` (authenticated) |

The `api` and `auth` services declare `depends_on` with `condition: service_healthy` for PostgreSQL, Redis, and RabbitMQ, so Docker Compose waits for infrastructure readiness before starting application containers.
