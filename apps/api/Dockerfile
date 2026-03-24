# Build context: monorepo root
# docker build -f apps/api/Dockerfile -t monorepo-api .

FROM node:24-alpine AS base
RUN corepack enable

# ── Install all deps (dev included for build) ───────────────────────────────
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# Build workspace dependencies first, then api
RUN pnpm --filter api... build

# Produce a standalone deployment folder with only production deps
RUN pnpm deploy --filter=api --prod /deploy/api

# ── Final image ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
COPY --from=builder /deploy/api .
EXPOSE 3001
CMD ["node", "dist/main"]
