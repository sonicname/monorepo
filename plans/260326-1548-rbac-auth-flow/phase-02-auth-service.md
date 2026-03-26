---
phase: 2
title: "Auth Service - JWT, gRPC, Verify Endpoint"
status: pending
effort: 1h
depends_on: [1]
---

# Phase 2: Auth Service

## Context Links
- Auth service: `apps/auth/src/auth/auth.service.ts`
- Auth controller: `apps/auth/src/auth/auth.controller.ts`
- JWT strategy: `apps/auth/src/auth/strategies/jwt.strategy.ts`
- gRPC controller: `apps/auth/src/auth-grpc/auth-grpc.controller.ts`

## Overview
Update auth service to include `role` in JWT payload, API responses, gRPC responses, and Traefik forwardAuth headers.

## Key Insights
- `JwtPayload` type in `jwt.strategy.ts` drives what goes into the token
- `signToken()` in `auth.service.ts` creates the JWT -- add role param
- `sanitize()` in `auth.service.ts` shapes API response -- add role
- `verify` endpoint sets `X-User-*` headers -- add `X-User-Role`
- `AuthenticatedRequest.user` type in controller needs role field
- gRPC controller reads JWT payload directly via `jwtService.verify()` -- role already in payload after JWT change
- gRPC `getUser` fetches from DB -- role now in `UserRow` after Phase 1

---

## Related Code Files

### Files to Modify
- `apps/auth/src/auth/strategies/jwt.strategy.ts` -- add role to JwtPayload + validate()
- `apps/auth/src/auth/auth.service.ts` -- add role to signToken(), sanitize(), register(), login()
- `apps/auth/src/auth/auth.controller.ts` -- add role to AuthenticatedRequest, X-User-Role header
- `apps/auth/src/auth-grpc/auth-grpc.controller.ts` -- add role to gRPC responses

---

## Implementation Steps

### 1. Update JwtPayload and JwtStrategy

In `apps/auth/src/auth/strategies/jwt.strategy.ts`:

```ts
export type JwtPayload = {
  sub: string;
  email: string;
  username: string;
  role: string;   // <-- NEW
};

// In validate():
validate(payload: JwtPayload) {
  return {
    id: payload.sub,
    email: payload.email,
    username: payload.username,
    role: payload.role,   // <-- NEW
  };
}
```

### 2. Update AuthService

In `apps/auth/src/auth/auth.service.ts`:

**signToken** -- add role parameter:
```ts
private signToken(id: string, email: string, username: string, role: string): string {
  const payload: JwtPayload = { sub: id, email, username, role };
  return this.jwtService.sign(payload);
}
```

**sanitize** -- add role:
```ts
private sanitize(user: { id: string; email: string; username: string; role: string; createdAt: string }) {
  return { id: user.id, email: user.email, username: user.username, role: user.role, createdAt: user.createdAt };
}
```

**register** -- pass role (from newly created user, defaults to `'user'`):
```ts
// In register():
return {
  accessToken: this.signToken(user.id, user.email, user.username, user.role),
  user: this.sanitize(user),
};
```

**login** -- same pattern:
```ts
// In login():
return {
  accessToken: this.signToken(user.id, user.email, user.username, user.role),
  user: this.sanitize(user),
};
```

### 3. Update AuthController

In `apps/auth/src/auth/auth.controller.ts`:

```ts
type AuthenticatedRequest = Request & {
  user: { id: string; email: string; username: string; role: string };
};

// In verify():
verify(@Request() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
  res.setHeader('X-User-Id', req.user.id);
  res.setHeader('X-User-Email', req.user.email);
  res.setHeader('X-User-Username', req.user.username);
  res.setHeader('X-User-Role', req.user.role);   // <-- NEW
}
```

### 4. Update gRPC controller

In `apps/auth/src/auth-grpc/auth-grpc.controller.ts`:

**VerifyToken** -- role is now in JWT payload:
```ts
return {
  valid: true,
  userId: payload.sub,
  email: payload.email,
  username: payload.username,
  error: '',
  role: payload.role,   // <-- NEW
};

// Error case:
return { valid: false, userId: '', email: '', username: '', error: message, role: '' };
```

**GetUser** -- role is now in UserRow from DB:
```ts
// Found:
return { found: true, userId: user.id, email: user.email, username: user.username, role: user.role };

// Not found:
return { found: false, userId: '', email: '', username: '', role: '' };
```

---

## Todo List
- [ ] Add `role` to `JwtPayload` type
- [ ] Add `role` to `validate()` return in JwtStrategy
- [ ] Add `role` param to `signToken()`
- [ ] Add `role` to `sanitize()` method
- [ ] Pass `user.role` in `register()` and `login()`
- [ ] Add `role` to `AuthenticatedRequest` type
- [ ] Add `X-User-Role` header in `verify()` endpoint
- [ ] Add `role` to `VerifyToken` gRPC response
- [ ] Add `role` to `GetUser` gRPC response
- [ ] Verify auth service compiles: `pnpm --filter auth build`

## Success Criteria
- JWT tokens include `role` claim
- `/api/auth/register` and `/api/auth/login` responses include `role` in user object
- `/api/auth/verify` sets `X-User-Role` header
- gRPC `VerifyToken` and `GetUser` return role
- Auth service builds and starts without errors

## Risk Assessment
- **Existing JWTs**: Tokens issued before this change won't have `role`. JwtStrategy's `validate()` will return `role: undefined`. Consider handling this in API guards (treat missing role as `'user'`).
- **Migration**: Users must re-login to get new JWT with role claim.

## Security Considerations
- Role in JWT is derived from DB at login time; changing a user's role requires re-login
- `X-User-Role` header set by auth service (trusted), not by client
