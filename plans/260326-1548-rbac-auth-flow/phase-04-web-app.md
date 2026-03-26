---
phase: 4
title: "Web App - Session, Route Protection, UI"
status: pending
effort: 1.5h
depends_on: [2]
---

# Phase 4: Web App

## Context Links
- Session server: `apps/web/app/lib/session.server.ts`
- Auth route: `apps/web/app/routes/auth.tsx`
- Home route: `apps/web/app/routes/home.tsx`
- Routes config: `apps/web/app/routes.ts`
- Root layout: `apps/web/app/root.tsx`

## Overview
Update the web app to store role in session, provide route protection helpers, and conditionally render UI based on user role.

## Key Insights
- `session.server.ts` already stores `user` object in cookie session -- just need to add `role` to type
- Auth API response already includes role after Phase 2
- `requireAuth()` returns token; need a `requireRole()` that checks role
- React Router v7 loaders are server-side -- role check happens before render
- No client-side JS role check needed for security (server loaders gate access)

---

## Related Code Files

### Files to Modify
- `apps/web/app/lib/session.server.ts` -- add role to SessionUser, add requireRole()
- `apps/web/app/routes/auth.tsx` -- update AuthApiResponse type to include role
- `apps/web/app/routes/home.tsx` -- pass user info to UI, show role-based content

### Files to Create
- `apps/web/app/routes/admin.tsx` -- admin-only page (example protected route)
- `apps/web/app/routes/logout.tsx` -- dedicated logout route (currently logoutAction is unused export)

---

## Implementation Steps

### 1. Update SessionUser type and add helpers

In `apps/web/app/lib/session.server.ts`:

```ts
import type { UserRole } from '@monorepo/contracts';

type SessionUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: string;
};

// Add requireUser helper:
export async function requireUser(request: Request): Promise<SessionUser> {
  const session = await getSession(request.headers.get('Cookie'));
  const user = session.get('user') as SessionUser | undefined;
  if (!user) throw redirect('/auth');
  return user;
}

// Add requireRole helper:
export async function requireRole(request: Request, ...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser(request);
  if (!roles.includes(user.role)) {
    throw new Response('Forbidden', { status: 403 });
  }
  return user;
}
```

### 2. Update auth route response type

In `apps/web/app/routes/auth.tsx`:

Update `AuthApiResponse`:
```ts
type AuthApiResponse = {
  accessToken: string;
  user: { id: string; email: string; username: string; role: string; createdAt: string };
};
```

No other changes needed -- `session.set('user', data.user)` already stores the full user object.

### 3. Create logout route

In `apps/web/app/routes/logout.tsx`:
```tsx
import { redirect } from 'react-router';
import { destroySession, getSession } from '../lib/session.server';
import type { Route } from './+types/logout';

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  throw redirect('/auth', {
    headers: { 'Set-Cookie': await destroySession(session) },
  });
}

export function loader() {
  throw redirect('/');
}
```

### 4. Update routes config

In `apps/web/app/routes.ts`:
```ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("auth", "routes/auth.tsx"),
  route("logout", "routes/logout.tsx"),
  route("admin", "routes/admin.tsx"),
] satisfies RouteConfig;
```

### 5. Create admin page (example protected route)

In `apps/web/app/routes/admin.tsx`:
```tsx
import { requireRole } from '../lib/session.server';
import type { Route } from './+types/admin';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireRole(request, 'admin');
  return { user };
}

export function meta() {
  return [{ title: 'Admin - Monorepo' }];
}

export default function AdminPage({ loaderData }: Route.ComponentProps) {
  return (
    <main className="status-shell">
      <section className="status-grid">
        <div className="hero-card">
          <span className="eyebrow">Admin panel</span>
          <h1 className="hero-title">Administration</h1>
          <p className="hero-copy">
            Logged in as {loaderData.user.username} ({loaderData.user.role})
          </p>
        </div>
      </section>
    </main>
  );
}
```

### 6. Update home page with user context

In `apps/web/app/routes/home.tsx`:

Add user info to loader:
```ts
import { getSessionUser } from '../lib/session.server';

// In loader():
export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  // ... existing loader code
  return {
    // ... existing data
    user,
  };
}
```

Add user bar to UI (top of `<main>`):
```tsx
{loaderData.user && (
  <div className="user-bar">
    <span>{loaderData.user.username} ({loaderData.user.role})</span>
    {loaderData.user.role === 'admin' && (
      <a href="/admin" className="auth-link">Admin</a>
    )}
    <Form method="post" action="/logout">
      <button type="submit" className="auth-link">Sign out</button>
    </Form>
  </div>
)}
{!loaderData.user && (
  <div className="user-bar">
    <a href="/auth" className="auth-link">Sign in</a>
  </div>
)}
```

Note: `loader` needs `request` param -- currently the home loader takes no args. Update signature to `loader({ request }: Route.LoaderArgs)`.

---

## Todo List
- [ ] Add `role` to `SessionUser` type in `session.server.ts`
- [ ] Add `requireUser()` helper to `session.server.ts`
- [ ] Add `requireRole()` helper to `session.server.ts`
- [ ] Update `AuthApiResponse` type in `auth.tsx` to include role
- [ ] Create `routes/logout.tsx` with action
- [ ] Create `routes/admin.tsx` with `requireRole('admin')`
- [ ] Update `routes.ts` with new routes
- [ ] Update `home.tsx` loader to pass user, add user bar UI
- [ ] Verify web app compiles: `pnpm --filter web build`

## Success Criteria
- Login stores role in session cookie
- `/admin` returns 403 for non-admin users, renders for admins
- `/logout` clears session and redirects to `/auth`
- Home page shows user bar with username and role
- Admin link only visible to admin users
- Non-authenticated users see "Sign in" link

## Risk Assessment
- **Session cookie size**: Adding role (5-6 chars) is negligible
- **Stale role in session**: If admin changes user role in DB, session retains old role until re-login. Acceptable for simple RBAC.

## Security Considerations
- Role checks happen in server-side loaders, not client JS
- `requireRole()` throws 403 before any data loads
- Session cookie is httpOnly + encrypted -- role cannot be tampered client-side
