# Monorepo Architecture Exploration Report

**Date:** 2026-03-26 | **Working Dir:** /home/weeboo/Code/monorepo

## Executive Summary

This monorepo contains a full-stack authentication and API system with a React Router SSR web frontend. The architecture uses:
- **Traefik** as an HTTP reverse proxy with JWT-based forwardAuth middleware
- **Auth service** (apps/auth) as a dedicated NestJS microservice managing JWTs and user credentials
- **API service** (apps/api) as a protected REST API that relies on Traefik to propagate user headers
- **Web app** (apps/web) using React Router v7 with server-side sessions and cookie-based auth
- **gRPC** for inter-service communication (auth verification between services)
- **PostgreSQL** with separate databases for auth and API data
- **BullMQ + Redis** for job queuing, and **RabbitMQ** for event-driven architecture

---

## 1. Auth Service (apps/auth/src/)

### Overview
Dedicated microservice for authentication handling. Runs on port 3002 (HTTP) and 5001 (gRPC).

### Key Components

#### **Auth Module** (`auth/`)
- **AuthService** (`auth.service.ts`)
  - `register(dto)`: Creates new user with bcrypt hash (12 salt rounds)
  - `login(dto)`: Validates credentials and issues JWT
  - `signToken()`: Signs JWT with 7-day expiration
  - Uses bcryptjs v2.4.3 for password hashing
  - JWT payload: `{ sub: userId, email, username }`

- **AuthController** (`auth.controller.ts`)
  - `POST /api/auth/register`: Public endpoint for user registration
  - `POST /api/auth/login`: Public endpoint for user login
  - `GET /api/auth/me`: Protected endpoint returning authenticated user
  - `GET /api/auth/verify`: **Critical for Traefik forwardAuth**
    - Guards with JwtAuthGuard
    - Sets X-User-Id, X-User-Email, X-User-Username response headers
    - Called by Traefik before forwarding requests to apps/api
    - Returns 200 on valid JWT, 401 on invalid

- **JwtAuthGuard** (`guards/jwt-auth.guard.ts`)
  - Simple NestJS Passport guard extending AuthGuard('jwt')
  - Used on protected endpoints

- **JwtStrategy** (`strategies/jwt.strategy.ts`)
  - Passport JWT strategy
  - Extracts token from Authorization: Bearer header
  - Secret from JWT_SECRET env var (default: 'change-me-in-production')
  - Validates payload and returns user object

#### **Auth gRPC Microservice** (`auth-grpc/`)
- **AuthGrpcController** (`auth-grpc.controller.ts`)
  - `VerifyToken(token: string)`: Returns user details if JWT is valid
  - `GetUser(userId: string)`: Fetches user from database
  - Used by apps/api to verify tokens via gRPC (alternative to Traefik)

#### **Database**
- Uses `@monorepo/database/auth` package
- Single `users` table with schema:
  - `id`: UUID, primary key
  - `email`: unique, required
  - `username`: unique, required
  - `passwordHash`: bcrypt hash, required
  - `createdAt`: auto-timestamp
  - `updatedAt`: required timestamp
- DatabaseService wraps Drizzle ORM connection and UsersRepository

#### **Configuration**
- RuntimeConfigService reads:
  - `AUTH_PORT`: 3002 (default)
  - `JWT_SECRET`: from env, default 'change-me-in-production'
  - `AUTH_DATABASE_URL`: PostgreSQL connection string
  - `AUTH_GRPC_PORT`: 5001 (default)
- Uses @monorepo/config for environment validation

#### **Validation**
- DTO validation with class-validator:
  - LoginDto: email (IsEmail), password (MinLength 8)
  - RegisterDto: email (IsEmail), username (MinLength 3), password (MinLength 8)

### DTOs
```
LoginDto: { email, password }
RegisterDto: { email, username, password }
AuthResponse: { accessToken, user: { id, email, username, createdAt } }
```

---

## 2. API Service (apps/api/src/)

### Overview
Protected REST API service running on port 3001. Protected by Traefik's JWT middleware.

### Key Components

#### **Auth gRPC Client** (`auth-grpc/`)
- **AuthGrpcService** (`auth-grpc.service.ts`)
  - Connects to apps/auth's gRPC service at AUTH_GRPC_URL (default: 127.0.0.1:5001)
  - Methods:
    - `verifyToken(token)`: Verify JWT via gRPC
    - `getUser(userId)`: Fetch user details
  - Used as alternative to Traefik headers for token verification

- **AuthGrpcModule** (`auth-grpc.module.ts`)
  - Registers ClientsModule for gRPC transport
  - Configures gRPC client connection

#### **Projects Module** (`projects/`)
- **ProjectsService**: Business logic for project operations
- **ProjectsController**: REST endpoints
- **ProjectsQueueService** & **ProjectsQueueProcessor**: BullMQ job handling
- Connected to API PostgreSQL database

#### **RabbitMQ Module** (`rabbitmq/`)
- Event-driven architecture
- RabbitMQ publish/subscribe for async operations
- Queue name: 'projects' (configurable via PROJECTS_QUEUE_NAME)

#### **Database**
- Uses `@monorepo/database/api` package
- Drizzle ORM with PostgreSQL
- Projects table schema available

#### **Configuration**
- RuntimeConfigService reads:
  - `API_PORT`: 3001
  - `API_DATABASE_URL`: PostgreSQL for API data
  - `AUTH_GRPC_URL`: 127.0.0.1:5001 (default)
  - BullMQ, RabbitMQ, web/API origin config

#### **CORS**
- Enabled with origin from WEB_URL env var
- Configured in main.ts

#### **No JWT Guards on API Routes**
- **Important:** The API service does NOT use @UseGuards(JwtAuthGuard)
- **Instead:** Traefik's forwardAuth middleware handles JWT verification
- Traefik calls `/api/auth/verify` and adds X-User-* headers to forwarded requests
- API extracts user info from request headers (set by Traefik)

### Missing RBAC/Permissions
- **Currently:** No role-based access control implemented
- **Users table:** Only has email, username, passwordHash; no roles or permissions fields
- **API routes:** No guard checking user roles or permissions
- **Recommendation:** Add role/permission columns to users table and create RBAC guards

---

## 3. Web App (apps/web/app/)

### Overview
React Router v7 SSR application running on port 5173. Uses cookie-based sessions for client-side auth.

### Key Components

#### **Session Management** (`lib/session.server.ts`)
- Uses React Router's `createCookieSessionStorage`
- Session cookie: `__auth`
  - httpOnly: true (prevents JS access)
  - secure: true (only HTTPS in production)
  - sameSite: 'lax'
  - maxAge: 7 days
  - secrets: [SESSION_SECRET env var, default: 'change-me-in-production']
- Exports:
  - `getSession()`: Load session from cookie
  - `commitSession()`: Save session to cookie
  - `destroySession()`: Clear session
  - `requireAuth()`: Redirect to /auth if no token
  - `getSessionUser()`: Get user from session

- SessionUser type:
  ```
  { id, email, username, createdAt }
  ```

#### **Auth Route** (`routes/auth.tsx`)
- **Loader:** Redirects to home if already authenticated
- **Action:** Handles login/register form submission
  - Determines mode from ?mode=register query param
  - POSTs to AUTH_SERVICE_URL (default: http://127.0.0.1:3002)
  - Endpoint: /api/auth/register or /api/auth/login
  - Stores accessToken in session cookie
  - Stores user object in session
  - Redirects to home on success

- **Logout:** `logoutAction()` destroys session and redirects to /auth

- **UI:** Toggle between login and register forms with shared password/email fields

#### **Home Route** (`routes/home.tsx`)
- Loader fetches:
  - Health status from /health
  - Projects from /api/projects
  - Queue status from /api/projects/queue
- Displays API integration details and project feed
- BullMQ queue submission form

#### **Routing** (`routes.ts`)
- Simple React Router v7 config:
  - `/` → home.tsx
  - `/auth` → auth.tsx

#### **No Auth Guard on Home**
- **Currently:** Home route has no requireAuth() check
- **Recommendation:** Add `requireAuth(request)` in home loader to protect it

#### **Configuration**
- AUTH_SERVICE_URL env var (default: http://127.0.0.1:3002)
- SESSION_SECRET env var (default: 'change-me-in-production')

---

## 4. Traefik Reverse Proxy Setup

### Docker Compose Config (docker-compose.dev.yml)

#### **Architecture**
```
Client → Traefik (port 80) → Auth Service (3002) / API Service (3001) / Web App (5173)
```

#### **JWT Middleware (forwardAuth)**
```yaml
middlewares:
  jwt-verify:
    forwardauth:
      address: http://auth:3002/api/auth/verify
      authResponseHeaders: X-User-Id,X-User-Email,X-User-Username
```

#### **Routing Rules**
1. **Auth Service**: `PathPrefix(/api/auth)` → port 3002 (no middleware, public)
2. **API Service**: `PathPrefix(/api)` → port 3001 with `jwt-verify` middleware
3. **Web App**: `PathPrefix(/)` → port 5173 (catch-all, lowest priority)

#### **Flow**
1. Client requests `/api/projects`
2. Traefik matches `/api` rule
3. Traefik calls `/api/auth/verify` (forwardAuth) with Authorization header
4. Auth service returns 200 + X-User-* headers if valid JWT
5. Traefik forwards request to API service with X-User-* headers added
6. API service extracts user from headers (if implemented)

#### **Key Insight**
- Auth service's `/api/auth/verify` endpoint is the **verification point**
- It returns 200 with headers on success, 401 on failure
- **Apps/api does NOT verify JWTs itself** — it trusts Traefik

---

## 5. Environment Configuration (packages/config/)

### Key Defaults
```
WEB_PORT: 5173
API_PORT: 3001
AUTH_GRPC_PORT: 5001
AUTH_GRPC_URL: 127.0.0.1:5001
DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/monorepo
AUTH_DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/monorepo_auth
API_DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/monorepo_api
REDIS_URL: redis://127.0.0.1:6379
RABBITMQ_URL: amqp://guest:guest@127.0.0.1:5672
BULLMQ_PREFIX: monorepo
PROJECTS_QUEUE_NAME: projects
```

### Validation
- Zod schema for runtime env validation
- URL scheme validation (http/https for web, postgres for DB, redis for Redis, etc.)
- Boolean parsing from 'true'/'false' strings

---

## 6. Protobuf Definitions (packages/proto/)

### Auth Service gRPC Contract
```protobuf
service AuthService {
  rpc VerifyToken (VerifyTokenRequest) returns (VerifyTokenResponse);
  rpc GetUser (GetUserRequest) returns (GetUserResponse);
}

message VerifyTokenRequest {
  string token = 1;
}

message VerifyTokenResponse {
  bool valid = 1;
  string user_id = 2;
  string email = 3;
  string username = 4;
  string error = 5;
}

message GetUserRequest {
  string user_id = 1;
}

message GetUserResponse {
  bool found = 1;
  string user_id = 2;
  string email = 3;
  string username = 4;
}
```

---

## 7. Database Schema

### Auth Database (`monorepo_auth`)
**users table**:
- id (UUID, PK)
- email (unique)
- username (unique)
- passwordHash (bcrypt)
- createdAt (timestamp with TZ)
- updatedAt (timestamp with TZ)

### API Database (`monorepo_api`)
- projects table (details in packages/database/src/schema/api/projects.ts)

---

## 8. Key Flows

### User Registration
1. Client submits form to `/auth?mode=register`
2. Web app POSTs to `/api/auth/register` (AUTH_SERVICE_URL)
3. Auth service creates user, hashes password, issues JWT
4. Web app stores JWT + user in session cookie
5. Browser redirected to `/` (home)

### User Login
1. Client submits form to `/auth`
2. Web app POSTs to `/api/auth/login` (AUTH_SERVICE_URL)
3. Auth service verifies credentials, issues JWT
4. Web app stores JWT + user in session cookie
5. Browser redirected to `/` (home)

### Protected API Request
1. Client has session cookie with JWT
2. Client requests `/api/projects`
3. Traefik intercepts, calls `/api/auth/verify` with Authorization header
4. Auth service validates JWT, returns X-User-* headers
5. Traefik forwards request to API with headers
6. API processes request (can extract user from headers)

### gRPC Fallback (Alternative)
- Apps/api can independently verify tokens using AuthGrpcService
- `verifyToken()` method calls auth service's gRPC VerifyToken RPC
- Useful if Traefik forwardAuth is bypassed or for internal verification

---

## 9. Security Observations

### Current Implementation
- ✅ Passwords hashed with bcryptjs (12 rounds)
- ✅ JWTs signed with HS256 (JWT_SECRET)
- ✅ Session cookies httpOnly and sameSite
- ✅ JWT expiration: 7 days
- ⚠️ Session cookie secret: hardcoded default 'change-me-in-production'
- ⚠️ JWT_SECRET: hardcoded default 'change-me-in-production'

### Missing
- ❌ No refresh token rotation
- ❌ No token revocation mechanism
- ❌ No audit logging
- ❌ No rate limiting on auth endpoints
- ❌ No RBAC/permission model
- ❌ No API routes validate user headers from Traefik

---

## 10. File Locations Summary

### Auth App
```
apps/auth/src/
├── auth/
│   ├── auth.service.ts          (register, login, JWT signing)
│   ├── auth.controller.ts       (POST /register, /login, GET /me, /verify)
│   ├── strategies/jwt.strategy.ts
│   ├── guards/jwt-auth.guard.ts
│   └── dto/
│       ├── login.dto.ts
│       └── register.dto.ts
├── auth-grpc/
│   ├── auth-grpc.controller.ts  (VerifyToken, GetUser RPC methods)
│   └── auth-grpc.module.ts
├── database/
│   └── database.service.ts
├── config/
│   └── runtime-config.service.ts
├── app.module.ts
└── main.ts
```

### API App
```
apps/api/src/
├── auth-grpc/
│   ├── auth-grpc.service.ts     (gRPC client)
│   └── auth-grpc.module.ts
├── projects/
│   ├── projects.service.ts
│   ├── projects.controller.ts
│   ├── projects-queue.service.ts
│   └── projects-queue.processor.ts
├── database/
│   └── database.service.ts
├── config/
│   └── runtime-config.service.ts
├── rabbitmq/
│   ├── rabbitmq.service.ts
│   ├── rabbitmq.module.ts
│   └── (queue handlers)
├── app.controller.ts            (GET /health)
├── app.service.ts
├── app.module.ts
└── main.ts
```

### Web App
```
apps/web/app/
├── lib/
│   └── session.server.ts        (cookie session storage, auth helpers)
├── routes/
│   ├── auth.tsx                 (login/register form, auth flow)
│   └── home.tsx                 (protected home, API integration)
├── routes.ts                    (route config)
├── root.tsx                     (layout, error boundary)
└── (styling, etc.)
```

### Config & Proto
```
packages/config/src/
└── index.ts                     (env validation, helper functions)

packages/proto/src/
├── index.ts                     (gRPC service/message definitions)
└── proto/
    └── auth.proto               (Protobuf definitions)

packages/database/src/
├── auth.ts                      (auth database setup)
├── api.ts                       (api database setup)
├── schema/
│   ├── auth/users.ts            (users table schema)
│   └── api/projects.ts
└── repositories/
    ├── auth/users.repository.ts
    └── api/projects.repository.ts
```

---

## 11. Environment Variables

### Required (No Defaults)
- `AUTH_DATABASE_URL`
- `API_DATABASE_URL`
- `JWT_SECRET` (for production)
- `SESSION_SECRET` (for production)

### Optional (With Defaults)
- `NODE_ENV` (development, test, production)
- `WEB_PORT` (5173)
- `API_PORT` (3001)
- `WEB_URL` (http://127.0.0.1:5173)
- `API_URL` (http://127.0.0.1:3001)
- `AUTH_PORT` (3002)
- `AUTH_GRPC_URL` (127.0.0.1:5001)
- `REDIS_URL` (redis://127.0.0.1:6379)
- `RABBITMQ_URL` (amqp://guest:guest@127.0.0.1:5672)
- `BULLMQ_ENABLED` (auto if REDIS_URL)
- `RABBITMQ_ENABLED` (auto if RABBITMQ_URL)
- `BULLMQ_PREFIX` (monorepo)

---

## 12. Unresolved Questions / Observations

1. **API Routes Don't Extract User Headers**: Apps/api routes don't appear to validate or use the X-User-* headers from Traefik. The gRPC client exists but isn't used in controllers. How should API routes know who's making the request?

2. **RBAC Not Implemented**: No roles/permissions system. Users table only has credentials. What should the authorization model be?

3. **Token Revocation**: No logout endpoint that invalidates tokens. JWTs valid for 7 days regardless of logout. Should tokens be revocable?

4. **Refresh Tokens**: Only long-lived tokens issued. No refresh token rotation. Is this intentional?

5. **Session vs JWT Duality**: Web app uses session cookies + JWT. Why both? Is the JWT stored in the cookie?

6. **Home Route Unprotected**: Home route doesn't call requireAuth(). Should it be protected?

7. **Traefik vs gRPC Verification**: Both are available but docker-compose uses Traefik. When should each be used?

8. **API Database User Context**: How should API services know the authenticated user's ID/email if they can't access the auth database or Traefik headers aren't parsed?

---

## 13. Deployment Considerations

### Dev Environment
- Docker Compose runs all services in one stack
- Traefik on port 80 (insecure, ok for dev)
- All services on localhost/container names

### Production Considerations
- Set `NODE_ENV=production` for all services
- Set actual `JWT_SECRET` and `SESSION_SECRET` (not defaults)
- Enable HTTPS in Traefik
- Set `WEB_URL` and `API_URL` to production domains
- Restrict CORS origin to production web domain
- Use environment secrets for database URLs
- Enable database backups
- Monitor auth service for failed login attempts
- Consider adding rate limiting middleware
