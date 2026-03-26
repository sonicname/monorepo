---
phase: 5
title: "Integration Testing and DB Migration"
status: pending
effort: 1h
depends_on: [1, 2, 3, 4]
---

# Phase 5: Integration Testing and DB Migration

## Overview
Verify the full RBAC flow end-to-end: registration, login, JWT contents, Traefik header propagation, API guard enforcement, and web session behavior.

## Pre-requisites
- All packages built (Phase 1)
- Auth service updated (Phase 2)
- API service updated (Phase 3)
- Web app updated (Phase 4)

---

## Implementation Steps

### 1. Database migration

```bash
# Generate migration for role column
pnpm db:generate:auth

# Apply to running database
pnpm db:push:auth
```

Verify with psql:
```sql
\d users
-- Should show: role user_role DEFAULT 'user' NOT NULL
```

### 2. Build all packages and apps

```bash
pnpm run build:packages
pnpm --filter auth build
pnpm --filter api build
pnpm --filter web build
```

Or use `pnpm build` for full build.

### 3. Manual verification checklist

#### Auth service
```bash
# Register new user
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"testuser","password":"password123"}'
# Verify response includes role: "user"

# Decode JWT (paste token at jwt.io or use jq)
# Verify payload includes role: "user"

# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# Verify response includes role: "user"
```

#### gRPC
```bash
grpcurl -plaintext -proto packages/proto/proto/auth.proto \
  -d '{"token":"<jwt>"}' localhost:5001 auth.AuthService/VerifyToken
# Verify response includes role field
```

#### API service (via Traefik or direct with headers)
```bash
# With valid headers (simulating Traefik)
curl http://localhost:3001/api/projects \
  -H "X-User-Id: test-id" \
  -H "X-User-Email: test@test.com" \
  -H "X-User-Username: testuser" \
  -H "X-User-Role: user"
# Should return 200

# Without headers
curl http://localhost:3001/api/projects
# Should return 401

# Health endpoint (public)
curl http://localhost:3001/api/health
# Should return 200 without headers

# Admin-only endpoint (if created)
curl http://localhost:3001/api/some-admin-route \
  -H "X-User-Id: test-id" \
  -H "X-User-Email: test@test.com" \
  -H "X-User-Username: testuser" \
  -H "X-User-Role: user"
# Should return 403
```

#### Web app
1. Open `http://localhost:5173/auth` -- login form
2. Register new user -- redirects to `/`, user bar shows username + "user" role
3. Visit `/admin` -- should get 403 (non-admin)
4. Click "Sign out" -- redirects to `/auth`
5. Manually set user role to admin in DB, re-login, visit `/admin` -- should render

### 4. Promote a user to admin (manual SQL)

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@test.com';
```

### 5. Unit tests for API guards

If time permits, add tests for `AuthHeadersGuard` and `RolesGuard`:

```bash
pnpm --filter api test -- --testPathPattern=auth
```

Test cases:
- AuthHeadersGuard returns 401 when headers missing
- AuthHeadersGuard attaches user to request when headers present
- AuthHeadersGuard skips @Public() routes
- RolesGuard allows when no @Roles() set
- RolesGuard allows matching role
- RolesGuard returns 403 for non-matching role

---

## Todo List
- [ ] Generate and apply DB migration
- [ ] Verify existing users get default role `user`
- [ ] Build all packages and apps
- [ ] Test auth register/login responses include role
- [ ] Test JWT payload includes role
- [ ] Test gRPC VerifyToken/GetUser include role
- [ ] Test API guard rejects missing headers (401)
- [ ] Test API guard rejects wrong role (403)
- [ ] Test @Public() routes bypass guard
- [ ] Test web login stores role in session
- [ ] Test web /admin blocked for non-admin
- [ ] Test web logout clears session
- [ ] Write unit tests for guards (optional)

## Success Criteria
- Full register -> login -> access protected route -> logout flow works
- Role propagates: DB -> JWT -> Traefik header -> API guard -> allowed/denied
- Admin-only routes return 403 for regular users
- All apps build and start without errors
- No regressions in existing functionality

## Risk Assessment
- **Existing data**: Migration adds `role` with default `user` -- safe for existing rows
- **Docker compose**: May need to rebuild containers after proto/schema changes
