# System Architecture

Comprehensive overview of system topology, data flow, authentication, and integration patterns.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP :80
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Traefik v3                              │
│              Reverse Proxy & Load Balancer                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ forwardAuth: GET /api/auth/verify (JWT validation)   │  │
│  └──────────────────────────────────────────────────────┘  │
└──┬────────────────┬──────────────────┬────────────────────┘
   │                │                  │
   │ /api/auth      │ /api             │ /
   │ (no JWT)       │ (JWT required)   │ (SSR)
   │                │                  │
   ▼                ▼                  ▼
┌──────────┐  ┌──────────┐      ┌──────────┐
│   Auth   │  │   API    │      │   Web    │
│ :3002    │  │  :3001   │      │ :5173    │
│(HTTP)    │  │(HTTP)    │      │(SSR)     │
│ :5001    │  │          │      │          │
│(gRPC)    │  │          │      │          │
└────┬─────┘  └────┬─────┘      └────┬─────┘
     │             │                 │
     │ gRPC :5001  │                 │
     │◄────────────┤                 │
     │             │                 │
     │ HTTP        │                 │
     │◄─────────────────────────────┘
     │
     └────────────────┬────────────────┬─────────────┐
                      │                │             │
    (both apps)       ▼                ▼             ▼
                  ┌────────┐       ┌────────┐   ┌────────┐
                  │Postgres│       │ Redis  │   │RabbitMQ│
                  │ :5432  │       │ :6379  │   │ :5672  │
                  │        │       │        │   │        │
                  │monorepo│       │BullMQ  │   │Messages│
                  │_auth   │       │Queues  │   │        │
                  │monorepo│       │Cache   │   │        │
                  │_api    │       │        │   │        │
                  └────────┘       └────────┘   └────────┘
```

---

## Service Topology

### Service Roles

| Service | Type | Purpose | Port | Auth |
|---------|------|---------|------|------|
| **Traefik** | Ingress | Route HTTP, JWT validation via forwardAuth | 80, 8080 | N/A |
| **Auth** | Microservice | User management, JWT generation, token verification | 3002 (HTTP), 5001 (gRPC) | N/A |
| **API** | Microservice | Business logic, project management, queue coordination | 3001 | JWT required |
| **Web** | Frontend | React Router SSR, user interface | 5173 (dev), 3000 (prod) | Cookie-based |

### Inter-Service Communication

```
Web ──HTTP──> Auth          Register/Login (no JWT)
Web ──HTTP──> API           Data requests (JWT via Traefik)
Web ──HTTP──> Traefik       Browser routes (routing only)

API ──gRPC──> Auth          Token verification, user lookup
Traefik ──HTTP──> Auth      forwardAuth verification (internal)
```

---

## Authentication Flow

### Login/Register Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Client (Browser)                                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ 1. GET /auth (form)
                           ▼
            ┌──────────────────────────┐
            │ Auth SSR Loader          │
            │ (check session cookie)   │
            └────────┬─────────────────┘
                     │ 2. POST /auth (credentials)
                     │ (SSR action calls auth service directly)
                     ▼
    ┌────────────────────────────────┐
    │ Auth Service                   │
    │ POST /api/auth/login           │
    │ or /api/auth/register          │
    │                                │
    │ 1. Validate email/username     │
    │ 2. Hash password (bcrypt 12r)  │
    │ 3. Create JWT (15-min expiry)  │
    │ 4. Create refresh token       │
    │    (30-day, stored as SHA-256)│
    │ 5. Return tokens + user data  │
    └────────────┬───────────────────┘
                 │ 3. Response:
                 │ { accessToken, refreshToken, user }
                 ▼
    ┌────────────────────────────────┐
    │ Web SSR                         │
    │ 1. Set session cookie (__auth)  │
    │ 2. Redirect to /                │
    └────────────┬───────────────────┘
                 │ 4. GET / (with __auth cookie)
                 ▼
    ┌────────────────────────────────┐
    │ Browser                         │
    │ /auth cookies set              │
    │ Ready to access /api endpoints  │
    └────────────────────────────────┘
```

### API Request Flow (with JWT)

```
┌───────────────────────────────────────────┐
│ Browser                                   │
│ Authorization: Bearer <jwt_token>        │
└────────────────┬────────────────────────┘
                 │ 1. GET /api/projects
                 ▼
         ┌──────────────────────┐
         │ Traefik              │
         │ (matching /api route)│
         └──────────┬───────────┘
                    │ 2. forwardAuth
                    │ GET /api/auth/verify
                    │ Authorization: Bearer <jwt>
                    ▼
        ┌────────────────────────┐
        │ Auth Service           │
        │ /api/auth/verify       │
        │                        │
        │ 1. Decode JWT          │
        │ 2. Verify signature    │
        │ 3. Extract user info   │
        └────────┬───────────────┘
                 │ 3. Response:
                 │ 200 OK
                 │ X-User-Id: <id>
                 │ X-User-Email: <email>
                 │ X-User-Username: <username>
                 ▼
         ┌──────────────────────┐
         │ Traefik              │
         │ (forward headers)    │
         └──────────┬───────────┘
                    │ 4. GET /api/projects
                    │ + X-User-* headers
                    ▼
        ┌────────────────────────┐
        │ API Service            │
        │ /api/projects          │
        │                        │
        │ 1. Read X-User headers │
        │ 2. Query database      │
        │ 3. Return projects     │
        └────────┬───────────────┘
                 │ 5. Response: 200 OK
                 │ [{ id, name, ... }]
                 ▼
         ┌──────────────────────┐
         │ Browser              │
         │ Display projects     │
         └──────────────────────┘
```

---

## Database Design

### Dual Database Architecture

**Why two databases?**
- Data isolation: Auth data separate from business data
- Compliance: Some orgs require isolated credential storage
- Migration flexibility: Schema changes independent
- Backup strategy: Can restore auth without full API data

### Database Schema

#### monorepo_auth (Auth Service)

**users table**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- UUID v4
  email TEXT UNIQUE NOT NULL,       -- User email
  username TEXT UNIQUE NOT NULL,    -- Handle (min 3 chars)
  password_hash TEXT NOT NULL,      -- bcrypt hash (12 rounds)
  created_at TIMESTAMP NOT NULL,    -- Auto-generated
  updated_at TIMESTAMP NOT NULL     -- Auto-updated
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

**Purpose**: User credentials and profile data for authentication.

**refresh_tokens table**
```sql
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,              -- UUID v4
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,  -- SHA-256 hash of raw token
  revoked BOOLEAN DEFAULT FALSE,    -- Soft-revoke flag
  expires_at TIMESTAMPTZ NOT NULL,  -- 30-day expiry
  created_at TIMESTAMPTZ NOT NULL   -- Auto-generated
);

CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

**Purpose**: Refresh token storage for token rotation. Raw tokens are never stored — only SHA-256 hashes.

---

#### monorepo_api (API Service)

**projects table**
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,              -- UUID v4
  name TEXT NOT NULL,               -- Project name
  summary TEXT,                     -- Project description
  status TEXT NOT NULL,             -- ENUM: pending, in_progress, completed
  stack TEXT[],                     -- Array of tech (JSON stored)
  created_at TIMESTAMP NOT NULL,    -- Auto-generated
  updated_at TIMESTAMP NOT NULL     -- Auto-updated
);

-- Indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
```

**Purpose**: Project data and metadata for business operations.

---

### Connection Management

```typescript
// Auth Service
const authDb = await createAuthDatabase(
  process.env.AUTH_DATABASE_URL
);
const usersRepo = createUsersRepository(authDb);

// API Service
const apiDb = await createApiDatabase(
  process.env.API_DATABASE_URL
);
const projectsRepo = createProjectsRepository(apiDb);
```

**Connection pooling**: postgres.js handles internally (default: 10 connections)

---

## Queue Architecture

### BullMQ (Job Queue)

**Purpose**: Reliable background job processing with retries.

**Topology**:
```
Web App          →  Enqueue  →  Redis
                                 (queue: 'projects')
                                        │
                                        ▼
API Worker  ←─────  Fetch Job  ←─────┘
   │
   ├─ Process job
   │
   └─→ Mark complete/failed
       (keep 100 completed/failed)
```

**Configuration**:
```typescript
const queue = {
  name: 'projects',
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000  // 5s base delay: 5s, 10s, 20s
  },
  removeOnComplete: { age: 3600 },    // Keep 1 hour
  removeOnFail: { age: 86400 },       // Keep 24 hours
};
```

**Job Result**: Stored temporarily before cleanup.

---

### RabbitMQ (Message Broker)

**Purpose**: Async event publishing and consumption for loosely-coupled services.

**Topology**:
```
Publisher (API)      →  Publish  →  RabbitMQ Exchange
                                   'projects.events'
                                     (topic)
                                        │
                                        │ Routing key: 'projects.sync'
                                        ▼
Consumer (API)   ←─  Consume  ←─  Queue
                                 'projects.sync.api'
```

**Configuration**:
```
Exchange: 'projects.events'      (type: topic)
Queue: 'projects.sync.api'
Routing Pattern: 'projects.sync'
Durable: true
```

**Message Format**:
```typescript
{
  source: 'web' | 'api',
  trigger: 'manual' | 'system',
  requestedAt: ISO8601 timestamp
}
```

---

## Cache Layer

### @monorepo/cache

**Purpose**: JSON-serialised Redis cache with TTL support, used by any app/service.

**Dependencies**: `ioredis`, `@monorepo/config` (reads `REDIS_URL`).

**API**:

```typescript
import { createRedisClient, cacheGet, cacheSet, cacheDel } from '@monorepo/cache';

const redis = createRedisClient(process.env);

// Set with 1-hour TTL
await cacheSet(redis, 'user:123', { name: 'John' }, { ttl: 3600 });

// Get (returns parsed JSON or null)
const user = await cacheGet<{ name: string }>(redis, 'user:123');

// Delete
await cacheDel(redis, 'user:123');
```

**Additional helpers**: `cacheExists`, `cacheExpire`, `cacheTtl`.

**Connection**: Reuses the same `REDIS_URL` as BullMQ. `ioredis` client is created with `lazyConnect: true` — connects on first command.

---

## gRPC Integration

### Proto Definition

```protobuf
syntax = "proto3";
package auth;

service AuthService {
  rpc VerifyToken(VerifyTokenRequest) returns (VerifyTokenResponse);
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
}

message VerifyTokenRequest {
  string token = 1;
}

message VerifyTokenResponse {
  bool valid = 1;
  string userId = 2;
  string email = 3;
  string username = 4;
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

### Server (Auth Service)

```typescript
// apps/auth/src/auth-grpc/auth-grpc.controller.ts
@GrpcMethod('AuthService', 'VerifyToken')
verifyToken(request: VerifyTokenRequest): VerifyTokenResponse {
  // 1. Decode JWT
  // 2. Extract user info
  // 3. Return { valid, userId, email, username }
}

@GrpcMethod('AuthService', 'GetUser')
getUser(request: GetUserRequest): GetUserResponse {
  // 1. Query users repository
  // 2. Return { found, userId, email, username }
}
```

### Client (API Service)

```typescript
// apps/api/src/auth-grpc/auth-grpc.service.ts
@Injectable()
export class AuthGrpcService {
  private client: AuthService;

  onModuleInit() {
    this.client = this.clientGrpc.getService<AuthService>('AuthService');
  }

  verifyToken(token: string): Observable<VerifyTokenResponse> {
    return this.client.verifyToken({ token });
  }

  getUser(userId: string): Observable<GetUserResponse> {
    return this.client.getUser({ user_id: userId });
  }
}
```

**Usage in API**:
```typescript
constructor(private readonly authGrpc: AuthGrpcService) {}

// Inside a method
this.authGrpc.verifyToken(token).subscribe(response => {
  if (response.valid) {
    // Token is valid
  }
});
```

---

## Data Flow Examples

### Example 1: User Registration

```
1. User submits form
   POST /auth (browser)

2. Web SSR Server
   - Calls Auth service directly (bypasses Traefik)
   - POST http://auth:3002/api/auth/register
   - Body: { email, username, password }

3. Auth Service
   - Validates email/username format
   - Checks for duplicates (query users table)
   - Hash password with bcrypt (12 rounds)
   - Insert into users table
   - Generate JWT (HS256, 15-min expiry)
   - Generate refresh token (30-day, SHA-256 hashed)
   - Return { accessToken, refreshToken, user }

4. Web SSR
   - Set session cookie (__auth) with JWT
   - Redirect to /

5. Browser
   - Cookie stored
   - Next request includes __auth cookie
```

### Example 2: Fetch Projects (Protected)

```
1. Browser requests GET /api/projects
   Authorization: Bearer <jwt>

2. Traefik
   - Matches /api route (longest PathPrefix wins)
   - Calls forwardAuth: GET /api/auth/verify
   - Passes JWT in Authorization header

3. Auth Service verifies
   - Decodes JWT
   - Checks signature
   - Returns 200 + X-User-* headers

4. Traefik
   - Adds X-User-* headers
   - Routes to API service

5. API Service
   - Reads X-User-Id header
   - Queries projects table
   - Returns [{ id, name, summary, ... }]

6. Browser
   - Displays projects
```

### Example 3: Enqueue Job from Web

```
1. Home page action triggered
   enqueueProjectsSync({ source: 'web', trigger: 'manual' })

2. Web App (client-side)
   - Calls @monorepo/queues/bullmq
   - Connects to Redis
   - Creates job in queue

3. API Worker (running separately)
   - Polls Redis for jobs
   - Processes ProjectsSyncJobData
   - Updates projects table
   - Handles retries on failure
   - Completes or marks failed

4. Job Status Endpoint
   - GET /api/projects/queue
   - Returns { active, waiting, completed, failed, ... }
```

---

## Configuration Management

### Environment Variables by Service

**Shared** (all apps):
```
NODE_ENV=development|production
WEB_PORT=5173
API_PORT=3001
AUTH_PORT=3002
AUTH_GRPC_PORT=5001
AUTH_GRPC_URL=auth:5001
AUTH_DATABASE_URL=postgresql://...
API_DATABASE_URL=postgresql://...
REDIS_URL=redis://...
RABBITMQ_URL=amqp://...
BULLMQ_ENABLED=true
RABBITMQ_ENABLED=true
```

**Auth Only**:
```
JWT_SECRET=<32+ char secret>
JWT_EXPIRY=15m (access token), 30d (refresh token)
```

**Web Only**:
```
AUTH_SERVICE_URL=http://localhost:3002
API_URL=http://localhost:3001
API_BASE_PATH=/api
SESSION_SECRET=<32+ char secret>
```

### Validation

All apps validate at startup:

```typescript
const config = getValidatedRuntimeEnv();
if (!config) {
  Logger.error('Invalid environment configuration');
  process.exit(1);
}
```

---

## Security Architecture

### Authentication Layers

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| **Web Session** | Cookie-based (`__auth`) | Web app only |
| **API Auth** | JWT Bearer token | REST endpoints |
| **Service Auth** | gRPC plaintext (internal network) | Inter-service only |
| **Traefik Gateway** | forwardAuth validation | All incoming HTTP |

### Password Security

```typescript
// Registration
const passwordHash = await bcrypt.hash(password, 12);
// Store passwordHash in database

// Login
const isValid = await bcrypt.compare(password, user.passwordHash);
// 12 rounds = ~70ms per hash (acceptable for auth)
```

### JWT & Refresh Token Configuration

```typescript
// Access token — short-lived (15 minutes)
const accessToken = jwt.sign(
  { sub: userId, email, username, role },
  process.env.JWT_SECRET,  // HS256 (HMAC-SHA256)
  { expiresIn: '15m' }
);

// Refresh token — long-lived (30 days), stored as SHA-256 hash
const rawToken = randomBytes(48).toString('base64url');
const tokenHash = createHash('sha256').update(rawToken).digest('hex');
// Store tokenHash in refresh_tokens table, return rawToken to client
```

**Token Rotation Flow**:
1. Client sends expired access token → gets 401
2. Client calls `POST /api/auth/refresh` with `{ refreshToken }`
3. Auth service verifies hash exists, not revoked, not expired
4. Old refresh token is **revoked** (one-time use)
5. New access token + new refresh token issued
6. Client stores new pair

**Endpoints**:
- `POST /api/auth/refresh` — exchange refresh token for new pair
- `POST /api/auth/logout` — revoke single refresh token
- `POST /api/auth/logout-all` — revoke all user refresh tokens (requires JWT)

### HTTPS & TLS

- **Development**: Plain HTTP (dev.docker-compose.yml)
- **Production**: HTTPS with Let's Encrypt (Traefik ACME)

---

## Scaling Considerations

### Horizontal Scaling

**Stateless Services**:
- Web app: Can scale horizontally (SSR is stateless)
- API service: Can scale horizontally (no local state)
- Auth service: Can scale horizontally (JWT is stateless)

**Shared Infrastructure**:
- PostgreSQL: Single instance (requires read replicas for production)
- Redis: Single instance (requires cluster for production)
- RabbitMQ: Single instance (requires clustering for HA)

### Load Balancing Strategy

Traefik handles load balancing:
```
Browser → Traefik (routing) → Service instance 1, 2, 3...
```

Round-robin by default.

### Database Connection Pooling

postgres.js (Drizzle) manages pool:
```typescript
const db = new postgres(DATABASE_URL, {
  max: 10,  // Max connections per instance
});
```

Scale strategy: 10 connections × (number of API instances) < PostgreSQL max_connections

---

## Monitoring & Observability

### Health Checks

```typescript
// API Service
GET /health → 200 OK { status: 'up' }

// Used by Traefik for load balancing
```

### Logging

All services use NestJS Logger:
```
[Service] [Timestamp] [Level] Message
[ProjectsService] 2026-03-26T10:30:00Z [LOG] Creating project
[AuthService] 2026-03-26T10:30:01Z [ERROR] Failed to hash password
```

### Queue Monitoring

- **BullMQ**: `/api/projects/queue` endpoint shows queue stats
- **RabbitMQ**: Management UI at `localhost:15672`

---

## Error Handling Strategy

### HTTP Error Responses

```typescript
// Bad Request
400 {
  "message": "Invalid email format",
  "statusCode": 400
}

// Unauthorized
401 {
  "message": "Unauthorized",
  "statusCode": 401
}

// Conflict
409 {
  "message": "Email already registered",
  "statusCode": 409
}
```

### Service-to-Service Errors

**gRPC Errors** (Auth service):
```typescript
throw new RpcException({
  code: 'INVALID_ARGUMENT',
  message: 'Invalid token format'
});
```

**Job Failures** (BullMQ):
```typescript
// Automatic retry on throw
// Max 3 attempts with exponential backoff
// Then mark failed and keep for 24 hours
```

---

## Disaster Recovery

### Data Backup

**PostgreSQL**:
```bash
# Backup both databases
pg_dump -U postgres monorepo_auth > auth_backup.sql
pg_dump -U postgres monorepo_api > api_backup.sql

# Restore
psql -U postgres -d monorepo_auth < auth_backup.sql
```

**Redis** (BullMQ):
- Job data is temporary
- Can be lost without critical impact
- Retries will re-enqueue jobs

### Failover Strategy

1. **Auth Service Down**: API cannot verify tokens → All requests fail
2. **API Service Down**: Web can still serve, but data endpoints unavailable
3. **Database Down**: Services fail on first query → Requires manual intervention
4. **Redis Down**: BullMQ unavailable → Queue features disabled
5. **RabbitMQ Down**: Message publishing fails → Manual trigger disabled

**Recovery Priority**: PostgreSQL > Auth Service > API Service > Redis > RabbitMQ
