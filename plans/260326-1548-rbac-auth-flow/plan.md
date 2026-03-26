---
title: "RBAC Auth Flow"
description: "Add role-based access control across auth, api, and web apps with role enum on users table"
status: pending
priority: P1
effort: 6h
branch: development
tags: [auth, rbac, nestjs, react-router, grpc]
created: 2026-03-26
---

# RBAC Auth Flow

## Goal
Add a `role` column (enum: `admin`, `user`) to users, propagate role through JWT, gRPC, Traefik headers, and web session. Create guards/decorators in API for role-based access. Protect web routes by role.

## Build Order
Packages first (database, contracts, proto) -> auth app -> api app -> web app.

## Phases

| # | Phase | File | Status | Effort |
|---|-------|------|--------|--------|
| 1 | Shared packages (database schema, contracts, proto) | [phase-01](phase-01-shared-packages.md) | pending | 1h |
| 2 | Auth service (JWT, gRPC, verify endpoint) | [phase-02](phase-02-auth-service.md) | pending | 1h |
| 3 | API service (header extraction, guards, decorators) | [phase-03](phase-03-api-service.md) | pending | 1.5h |
| 4 | Web app (session, route protection, UI) | [phase-04](phase-04-web-app.md) | pending | 1.5h |
| 5 | Integration testing and DB migration | [phase-05](phase-05-integration-testing.md) | pending | 1h |

## Key Decisions
- Simple enum column (`admin`, `user`), not a permissions table -- YAGNI
- Default role = `user` on registration
- Role stored in JWT so no extra DB lookup per request
- Traefik forwardAuth adds `X-User-Role` header alongside existing `X-User-*` headers
- Web session stores role, `requireRole()` helper for loaders

## Dependencies
- Drizzle ORM pgEnum for role column
- No new npm packages needed (NestJS has built-in guards/decorators patterns)
- Proto file change requires rebuild of `@monorepo/proto`
