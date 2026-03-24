# Build context: monorepo root
# docker build -f apps/auth/Dockerfile -t monorepo-auth .

FROM node:24-alpine AS base
RUN corepack enable

# ── Install all deps (dev included for build) ───────────────────────────────
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# Build workspace dependencies first, then auth
RUN pnpm --filter auth... build

# Produce a standalone deployment folder with only production deps
RUN pnpm deploy --filter=auth --prod /deploy/auth

# ── Final image ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
COPY --from=builder /deploy/auth .
EXPOSE 3002
CMD ["node", "dist/main"]
