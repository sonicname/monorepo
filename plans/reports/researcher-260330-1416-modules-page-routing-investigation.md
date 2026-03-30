# Research Report: "modules-page-routing" & React Router v7 File-Based Routing

**Date:** 2026-03-30
**Status:** Complete
**Work Context:** d:\Code\monorepo

---

## Executive Summary

The npm package "modules-page-routing" **does not exist as a public package**. However, React Router v7 provides **native file-based routing** through the `@react-router/fs-routes` package, which appears to be what was being described.

React Router v7's framework mode includes built-in support for:
- Convention-based file routing (automatic route generation from file structure)
- Module-based organization with loaders/actions
- Full SSR support with typesafe data loading
- Error boundaries and middleware
- Dynamic segments, optional routes, splat routes

The user's clarification that "modules-page-routing IS compatible with React Router v7 framework mode and SSR" aligns perfectly with `@react-router/fs-routes`, which is a core component of React Router v7's framework mode.

---

## Key Findings

### 1. React Router v7 File-Based Routing API

**Package:** `@react-router/fs-routes`
**Status:** Built into React Router v7 framework mode
**Current monorepo version:** `react-router@7.12.0`

The monorepo already has React Router v7 installed but is using **manual route configuration** (not file-based routing yet).

### 2. Core Components

#### `app/routes.ts` Configuration
```typescript
import { type RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

export default flatRoutes() satisfies RouteConfig;
```

This is the entry point. `flatRoutes()` scans the file system and generates routes automatically.

#### Route Module Structure (Single File)
Each file in `app/routes/` is a **route module** with this shape:

```typescript
// app/routes/teams.$teamId.tsx
import type { Route } from "./+types/teams.$teamId";

// Server-side data loader (runs on server, sent to client)
export async function loader({ params }: Route.LoaderArgs) {
  const team = await fetchTeam(params.teamId);
  return { team };
}

// Server-side form handler (receives POST/PUT/DELETE)
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method === "POST") {
    await updateTeam(params.teamId, await request.formData());
  }
  return { ok: true };
}

// Component renders after loader completes (hydrated on client)
export default function TeamRoute({ loaderData }: Route.ComponentProps) {
  return <h1>{loaderData.team.name}</h1>;
}

// Optional: error boundary
export function ErrorBoundary() {
  const error = useRouteError();
  return <div>Error: {error.message}</div>;
}
```

### 3. Folder Structure Convention

File names map directly to URL paths:

```
app/routes/
├── _index.tsx                    → /
├── about.tsx                     → /about
├── concerts.tsx                  → /concerts (layout, renders children in <Outlet>)
├── concerts._index.tsx           → /concerts (index)
├── concerts.$city.tsx            → /concerts/:city
├── concerts.trending.tsx         → /concerts/trending
├── _auth.tsx                     → layout only, no URL
├── _auth.login.tsx              → /login (inside _auth layout)
├── _auth.register.tsx           → /register (inside _auth layout)
├── files.$.tsx                  → /files/* (splat/catch-all)
└── $.tsx                        → /* (404 handler)
```

**Naming Rules:**
- `_index.tsx` = index route (/)
- `.` = path segment separator (concerts.trending → /concerts/trending)
- `$` = dynamic segment (concerts.$city → /concerts/:city)
- `_prefix` = layout without URL segment
- `[character]` = escape special characters (sitemap[.]xml → /sitemap.xml)
- `($optional)` = optional segment

### 4. Loaders & Actions (SSR Integration)

**Loaders** run on server, data is serialized and sent to browser:
- Called during server render before component renders
- Results passed to component as `loaderData` prop
- Automatic code-splitting: loader code doesn't ship to browser

**Actions** handle form submissions (POST/PUT/DELETE):
- Form data automatically revalidates loaders after action succeeds
- Can return data to component via `actionData` prop
- Server-side only (no client-side action code sent)

**Client Loaders** supplement server loaders on the browser:
- Hydrate initial page load if `clientLoader.hydrate = true`
- Fetch additional data client-side
- Merge with server loader data

### 5. Type Safety

React Router auto-generates types in `.+types/[routeName]`:
```typescript
import type { Route } from "./+types/concerts.$city";
// Provides: LoaderArgs, ActionArgs, ComponentProps with fully inferred types
```

This ensures compile-time safety for:
- Route parameters (params.city)
- Loader data shape (loaderData)
- Action data shape (actionData)

### 6. Error Handling

**ErrorBoundary** catches errors in loaders, actions, and component rendering:
```typescript
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    // Thrown Response with status/statusText/data
    return <div>{error.status}: {error.data}</div>;
  } else if (error instanceof Error) {
    // Regular error with message/stack
    return <div>{error.message}</div>;
  }
}
```

One ErrorBoundary per route catches all nested errors. Can be placed at any level in the route tree.

### 7. Additional Exports (Route Module API)

```typescript
// HTTP response headers
export function headers() {
  return { "cache-control": "public, max-age=3600" };
}

// Meta tags for SEO
export function meta(): Route.MetaDescriptors {
  return [{ title: "My Page" }, { name: "description", content: "..." }];
}

// Link preloading, stylesheet loading
export function links(): Route.LinkDescriptors {
  return [{ rel: "prefetch", href: "/data.json" }];
}

// Custom data accessible via useMatches()
export const handle = { breadcrumb: "Teams" };

// Control loader revalidation after action
export function shouldRevalidate({ actionResult }) {
  return actionResult?.ok !== true;
}

// Fallback UI during server hydration
export function HydrateFallback() {
  return <Skeleton />;
}

// Middleware (runs on server before/after)
async function logging(context, next) {
  console.log(`${context.request.method} ${context.request.url}`);
  return await next();
}
export const middleware = [logging];
```

---

## Monorepo Integration Path

### Current State
- `apps/web` has React Router v7 installed (7.12.0)
- **No file-based routing currently** (would need to create routes.ts manually or use flatRoutes)
- Using default React Router v7 SSR setup

### To Enable "modules-page-routing" Pattern

**Option A: Manual Route Configuration (Current Approach)**
Keep using `routes.ts` with explicit route() calls for full control.

**Option B: File-Based Routing (Recommended for Convention)**
1. Install `@react-router/fs-routes` (already available, might be in dev deps)
2. Create `app/routes.ts`:
   ```typescript
   import { flatRoutes } from "@react-router/fs-routes";
   export default flatRoutes();
   ```
3. Create route modules in `app/routes/` directory
4. Each `.tsx` file becomes a route (naming conventions above)

### Key File Locations
- **Route config:** `apps/web/app/routes.ts`
- **Route modules:** `apps/web/app/routes/` (any `.tsx` files here become routes)
- **Root layout:** `apps/web/app/root.tsx` (wraps all routes)
- **Type definitions:** Auto-generated in `apps/web/app/+types/[routeName]`

---

## Data Flow: SSR with Loaders & Actions

```
1. HTTP Request arrives
   ↓
2. React Router matches route file (e.g., concerts.$city.tsx)
   ↓
3. Run loader({ params, request }) on server
   ↓
4. Render component with loaderData → HTML string
   ↓
5. Serialize loaderData to JSON
   ↓
6. Send HTML + <script>window.__data = {...}</script> to browser
   ↓
7. Browser hydrates React with serialized loaderData
   ↓
8. User submits form → POST to action
   ↓
9. Action receives FormData, updates database
   ↓
10. Loaders revalidate automatically
   ↓
11. Component re-renders with new loaderData
```

---

## Vite Configuration

React Router v7 framework mode handles Vite configuration via:
- `@react-router/dev` (includes Vite plugin)
- Dev server runs `react-router dev` (wraps Vite)
- Build command `react-router build` (calls Vite)

**No manual Vite config needed** for file-based routing — it's built-in.

Current `apps/web/package.json`:
```json
{
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev"
  }
}
```

Already correct for framework mode.

---

## Comparison: Manual Routes vs File-Based Routes

### Manual (Current)
```typescript
// app/routes.ts
export default [
  route("concerts/:city", "./concerts/city.tsx"),
  route("concerts/trending", "./concerts/trending.tsx"),
] satisfies RouteConfig;
```

**Pros:** Full control, explicit
**Cons:** Requires manual updates when adding routes

### File-Based (flatRoutes)
```
app/routes/
├── concerts.$city.tsx
└── concerts.trending.tsx
```

```typescript
// app/routes.ts
import { flatRoutes } from "@react-router/fs-routes";
export default flatRoutes();
```

**Pros:** Automatic, scales with codebase, less boilerplate
**Cons:** Must follow naming conventions

---

## Security & Best Practices

### Loader Data Serialization
- Loaders can only return **serializable data** (JSON)
- No functions, classes, Date objects without custom serialization
- Sensitive data (API keys) must not be in loaders — use server middleware instead

### Action Handlers
- Always validate request method (`if (request.method === "POST")`)
- Always validate CSRF token if not using same-origin requests
- Errors thrown in loaders/actions automatically caught by ErrorBoundary

### Type Safety
- Always import `type { Route }` from `.+types/[routeName]`
- Provides compile-time checking on loaderData, actionData, params

---

## Unresolved Questions

1. **Should the monorepo migrate to file-based routing?** This would require restructuring the routes directory and may conflict with existing manual route definitions.

2. **How should nested layouts interact with the existing auth middleware?** The Traefik forwardAuth pattern needs validation with file-based nested layouts.

3. **Are there any custom loaders/actions for auth integration?** Need to understand if `@monorepo/contracts` types should define loader/action contracts.

---

## Sources

- [Routing | React Router](https://reactrouter.com/start/framework/routing)
- [File Route Conventions | React Router](https://reactrouter.com/how-to/file-route-conventions)
- [Route Module | React Router](https://reactrouter.com/start/framework/route-module)
- [File-based routing in React Router v7 – Why keep it optional? - LogRocket Blog](https://blog.logrocket.com/file-based-routing-react-router-v7/)
- [React Router V7: A Crash Course - DEV Community](https://dev.to/pedrotech/react-router-v7-a-crash-course-2m86)
- [React Router Official Documentation](https://reactrouter.com/)
