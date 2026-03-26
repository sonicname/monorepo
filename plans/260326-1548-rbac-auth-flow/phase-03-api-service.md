---
phase: 3
title: "API Service - Header Extraction, Guards, Decorators"
status: pending
effort: 1.5h
depends_on: [1, 2]
---

# Phase 3: API Service

## Context Links
- API app module: `apps/api/src/app.module.ts`
- API gRPC service: `apps/api/src/auth-grpc/auth-grpc.service.ts`
- Projects controller: `apps/api/src/projects/projects.controller.ts`
- Contracts: `packages/contracts/src/index.ts`

## Overview
The API service sits behind Traefik forwardAuth. After Phase 2, Traefik forwards `X-User-Id`, `X-User-Email`, `X-User-Username`, and `X-User-Role` headers. This phase creates:
1. A guard that extracts these headers and attaches user to request
2. A `@Roles()` decorator + `RolesGuard` for RBAC
3. A `@CurrentUser()` param decorator for easy access

## Key Insights
- API routes are already behind Traefik forwardAuth -- all requests have valid `X-User-*` headers
- No passport/JWT needed in API service; trust the headers from Traefik
- Guards in NestJS can be applied globally, per-controller, or per-route
- Use `SetMetadata` for `@Roles()` decorator
- `AuthUser` type from `@monorepo/contracts` for type safety

---

## Related Code Files

### Files to Create
- `apps/api/src/auth/auth-headers.guard.ts` -- extracts X-User-* headers, attaches to request
- `apps/api/src/auth/roles.guard.ts` -- checks user role against required roles
- `apps/api/src/auth/roles.decorator.ts` -- @Roles() metadata decorator
- `apps/api/src/auth/current-user.decorator.ts` -- @CurrentUser() param decorator
- `apps/api/src/auth/auth.module.ts` -- exports guards

### Files to Modify
- `apps/api/src/app.module.ts` -- import AuthModule
- `apps/api/src/projects/projects.controller.ts` -- example usage of guards (optional)

---

## Implementation Steps

### 1. Create @Roles() decorator

`apps/api/src/auth/roles.decorator.ts`:
```ts
import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@monorepo/contracts';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

### 2. Create @CurrentUser() decorator

`apps/api/src/auth/current-user.decorator.ts`:
```ts
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@monorepo/contracts';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
```

### 3. Create AuthHeadersGuard

`apps/api/src/auth/auth-headers.guard.ts`:
```ts
import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthUser, UserRole } from '@monorepo/contracts';

@Injectable()
export class AuthHeadersGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.headers['x-user-id'] as string | undefined;
    const email = request.headers['x-user-email'] as string | undefined;
    const username = request.headers['x-user-username'] as string | undefined;
    const role = (request.headers['x-user-role'] as string | undefined) ?? 'user';

    if (!userId || !email || !username) {
      throw new UnauthorizedException('Missing authentication headers');
    }

    const user: AuthUser = { id: userId, email, username, role: role as UserRole };
    request.user = user;
    return true;
  }
}
```

### 4. Create RolesGuard

`apps/api/src/auth/roles.guard.ts`:
```ts
import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@monorepo/contracts';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // no @Roles() = allow any authenticated user
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

### 5. Create AuthModule

`apps/api/src/auth/auth.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthHeadersGuard } from './auth-headers.guard';
import { RolesGuard } from './roles.guard';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: AuthHeadersGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
```

**Note**: Registering as `APP_GUARD` applies globally. Routes that should be public (health check) need an `@Public()` decorator to skip.

### 6. Create @Public() decorator for unprotected routes

`apps/api/src/auth/public.decorator.ts`:
```ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

Update `AuthHeadersGuard` to check for `@Public()`:
```ts
// Add to AuthHeadersGuard constructor:
constructor(private readonly reflector: Reflector) {}

// In canActivate, before header extraction:
const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
  context.getHandler(),
  context.getClass(),
]);
if (isPublic) return true;
```

### 7. Update AppModule

In `apps/api/src/app.module.ts`, add import:
```ts
import { AuthModule } from './auth/auth.module';

// Add to imports array:
imports: [
  // ... existing imports
  AuthModule,
],
```

### 8. Mark public routes

In `apps/api/src/app.controller.ts` (health endpoint), add `@Public()`:
```ts
import { Public } from './auth/public.decorator';

@Public()
@Get('api/health')
getHealth() { ... }
```

In `apps/api/src/projects/projects.controller.ts`, decide per-route:
- `GET /api/projects` -- keep public or require auth
- Admin-only routes would use `@Roles('admin')`

### 9. Example: Admin-only route

```ts
@Roles('admin')
@Delete(':id')
deleteProject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
  // only admin can delete
}
```

---

## Todo List
- [ ] Create `apps/api/src/auth/roles.decorator.ts`
- [ ] Create `apps/api/src/auth/current-user.decorator.ts`
- [ ] Create `apps/api/src/auth/public.decorator.ts`
- [ ] Create `apps/api/src/auth/auth-headers.guard.ts` with Reflector + @Public support
- [ ] Create `apps/api/src/auth/roles.guard.ts`
- [ ] Create `apps/api/src/auth/auth.module.ts` with global guards
- [ ] Import `AuthModule` in `AppModule`
- [ ] Add `@Public()` to health/status endpoints
- [ ] Verify API service compiles: `pnpm --filter api build`

## Success Criteria
- All API requests without valid `X-User-*` headers return 401 (except @Public routes)
- Routes with `@Roles('admin')` return 403 for non-admin users
- `@CurrentUser()` correctly returns typed `AuthUser` object
- Health endpoint remains accessible without auth headers
- API service builds and starts without errors

## Risk Assessment
- **Global guard breaks health checks**: Mitigated by `@Public()` decorator
- **Missing role header**: Guard defaults to `'user'` role for backward compat with pre-migration JWTs
- **Traefik bypass**: If API is accessed directly (not through Traefik), headers can be spoofed. In dev this is acceptable; in prod, ensure API is only reachable via Traefik.

## Security Considerations
- `AuthHeadersGuard` trusts headers only because Traefik is the sole entry point in production
- `RolesGuard` uses allowlist pattern (must be in required roles list)
- Never expose role-change endpoints without admin-only protection
