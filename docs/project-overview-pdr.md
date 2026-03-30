# Project Overview & Product Development Requirements

## Project Purpose

A production-ready pnpm monorepo boilerplate demonstrating modern full-stack development patterns. Provides a scalable foundation for SaaS applications with real-time features, microservices architecture, and comprehensive dev tooling.

**Primary Goal**: Enable rapid development of secure, multi-service applications with clear separation of concerns (frontend, auth, API) while maintaining code reusability across service boundaries.

## Scope

**In Scope**:
- User authentication (registration, login, JWT tokens)
- Multi-service API architecture with dedicated auth microservice
- Server-side rendering (SSR) for web frontend
- Job queuing (BullMQ) and async messaging (RabbitMQ)
- gRPC inter-service communication
- Production Docker deployment with Traefik reverse proxy
- Database management (two separate PostgreSQL databases)
- Shared package ecosystem (config, constants, contracts, database, proto, queues)

**Out of Scope**:
- Third-party OAuth integration
- Advanced caching layers (Redis used only for BullMQ)
- Real-time features (WebSocket, subscriptions)
- Mobile app development

## Target Users

- **Developers**: Building full-stack JavaScript/TypeScript applications with NestJS + React
- **Teams**: Starting microservices projects with clear architectural boundaries
- **Organizations**: Deploying on containerized infrastructure (Docker, Kubernetes)

## Functional Requirements

### FR1: User Authentication
- **FR1.1** User registration with email/username validation
- **FR1.2** Secure login with bcrypt password hashing (rounds: 12)
- **FR1.3** JWT token generation (expiry: 7 days)
- **FR1.4** Token verification via HTTP and gRPC
- **FR1.5** User session management in web frontend (cookie-based)

### FR2: API Service
- **FR2.1** RESTful project listing endpoint (`GET /api/projects`)
- **FR2.2** Queue status monitoring (`GET /api/projects/queue`)
- **FR2.3** RabbitMQ status endpoint (`GET /api/rabbitmq`)
- **FR2.4** Manual project sync trigger (`POST /api/rabbitmq/projects/sync`)

### FR3: Job Processing
- **FR3.1** BullMQ job queue for project synchronization
- **FR3.2** Automatic job retry with exponential backoff (3 attempts, 5s base delay)
- **FR3.3** RabbitMQ message consumption with acknowledgment handling
- **FR3.4** Job result persistence and cleanup (keep 100 completed/failed)

### FR4: Frontend
- **FR4.1** Server-side rendering (SSR) for SEO and performance via React Router v7
- **FR4.2** File-based module routing using `modules-page-routing` (routes auto-generated from `modules/**/pages/**/*.tsx`)
- **FR4.3** Protected routes requiring authentication
- **FR4.4** Home page with data loading (projects + queue status)
- **FR4.5** Authentication pages (register/login)
- **FR4.6** Dark mode support via Tailwind CSS

### FR5: Data Persistence
- **FR5.1** Users table (auth database: `monorepo_auth`)
- **FR5.2** Projects table (api database: `monorepo_api`)
- **FR5.3** Automatic schema migrations via Drizzle ORM
- **FR5.4** Seed default projects on first deployment

### FR6: Messaging & Queuing
- **FR6.1** BullMQ integration for background jobs
- **FR6.2** RabbitMQ topic exchange for event broadcasting
- **FR6.3** Conditional queue enable/disable via environment

## Non-Functional Requirements

### NFR1: Performance
- **NFR1.1** API response time < 200ms (p95)
- **NFR1.2** SSR time < 500ms (p95) for home page
- **NFR1.3** Job processing latency < 5 seconds average
- **NFR1.4** Support 100+ concurrent users

### NFR2: Security
- **NFR2.1** All API endpoints protected by JWT (except `/api/auth/register`, `/api/auth/login`)
- **NFR2.2** gRPC communication over plaintext (internal network only)
- **NFR2.3** HTTPS in production (Let's Encrypt via Traefik)
- **NFR2.4** Secure password hashing (bcrypt 12 rounds)
- **NFR2.5** HttpOnly, SameSite=lax cookies for session tokens
- **NFR2.6** Environment variable secrets management (no hardcoded values)

### NFR3: Scalability
- **NFR3.1** Horizontal scaling of API service (stateless)
- **NFR3.2** Job queue scaling via Redis replicas
- **NFR3.3** Database connection pooling
- **NFR3.4** Modular package structure for selective dependency injection

### NFR4: Reliability
- **NFR4.1** 99.5% uptime SLA
- **NFR4.2** Health check endpoints for load balancing
- **NFR4.3** Graceful error handling and logging
- **NFR4.4** Job retry mechanism (3 attempts max)

### NFR5: Maintainability
- **NFR5.1** Consistent code style (Prettier, ESLint)
- **NFR5.2** Type safety (TypeScript strict mode)
- **NFR5.3** Test coverage > 80% for critical paths
- **NFR5.4** Clear separation of concerns (modules, repositories, services)

### NFR6: Deployability
- **NFR6.1** Docker multi-stage builds for all apps
- **NFR6.2** Zero-downtime deployments via health checks
- **NFR6.3** Environment-specific configuration (dev/prod)
- **NFR6.4** Automated database migrations on startup

## Acceptance Criteria

### Phase 1: Core Structure
- [ ] All three apps (web, auth, api) start without errors
- [ ] Docker Compose dev stack runs end-to-end
- [ ] Health endpoint responds with 200 OK
- [ ] Database schemas created in both databases

### Phase 2: Authentication
- [ ] User registration accepts valid credentials
- [ ] Login returns JWT token
- [ ] Token verification endpoint works (HTTP + gRPC)
- [ ] Protected API routes enforce JWT validation

### Phase 3: API & Queuing
- [ ] Projects endpoint returns seeded data
- [ ] BullMQ job enqueue/process cycle completes
- [ ] RabbitMQ message publish/consume works
- [ ] Queue status endpoint reflects accurate state

### Phase 4: Frontend Integration
- [ ] SSR renders home page without API errors
- [ ] Auth routes accessible without login
- [ ] Protected routes redirect to login when needed
- [ ] Session management persists across page reloads

### Phase 5: Production Readiness
- [ ] Docker Compose prod stack builds and runs
- [ ] Traefik reverse proxy routes all traffic correctly
- [ ] Database migrations run on container startup
- [ ] Health checks enable proper load balancing

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Build time (all apps) | < 2m | CI/CD pipeline |
| Test coverage | > 80% | Jest coverage report |
| Type check pass rate | 100% | TypeScript compiler |
| API latency (p95) | < 200ms | Application metrics |
| Job processing time | < 5s avg | Queue monitoring |
| Uptime | > 99.5% | Health check endpoint |
| Developer onboarding | < 30 min | First successful `pnpm dev` |

## Technical Constraints

1. **Node.js version**: 24+ (for Node.js built-ins support)
2. **Package manager**: pnpm 10+ (workspaces, strict hoisting)
3. **Database**: PostgreSQL 17 (two separate databases)
4. **TypeScript**: `strict: true` in all apps
5. **NestJS version**: 11.x (stable release)
6. **React Router**: v7.12.0 with SSR support
7. **Docker**: multi-stage builds, Alpine base images
8. **Traefik**: v3 reverse proxy (no v2)

## Architecture Decisions

### Why Microservices?
- **Separation of concerns**: Auth changes don't require full API rebuild
- **Independent scaling**: Auth and API scale independently
- **Clear contracts**: gRPC and REST boundaries well-defined
- **Technology flexibility**: Each service can use different tech stack (in future)

### Why Two Databases?
- **Data isolation**: Auth data separate from business data
- **Backup independence**: Can restore auth without full API data
- **Compliance**: Some orgs require isolated credential storage
- **Migration flexibility**: Schema changes don't affect both services

### Why Traefik?
- **Cloud-native**: Popular in Kubernetes deployments
- **JWT forwarding**: forwardAuth middleware pattern is clean
- **TLS ready**: Let's Encrypt integration for production
- **Dashboard**: Visual route inspection in dev

### Why BullMQ + RabbitMQ?
- **Dual pattern support**: Queue (jobs) + pubsub (events)
- **BullMQ**: Job retry, persistence, UI-friendly
- **RabbitMQ**: Distributed messaging, topic exchanges
- **Flexibility**: Disable either via environment flags

## Dependency Versions

| Package | Version | Rationale |
|---------|---------|-----------|
| NestJS | 11.x | Latest stable, better decorators |
| React Router | 7.12.0+ | SSR support, modern routing |
| Drizzle | Latest | Type-safe ORM, no runtime deps |
| TypeScript | 5.x | Strict mode, latest syntax |
| Node.js | 24+ | Native fetch, better ESM support |
| pnpm | 10+ | Strict hoisting, workspace improvements |

## Known Limitations

1. **gRPC plaintext only**: Production requires mTLS setup
2. **Single Postgres instance**: No read replicas in dev stack
3. **Redis optional**: BullMQ disabled if Redis unavailable
4. **No database sharding**: Single database per service
5. **No service mesh**: Traefik only, no Istio/Linkerd

## Future Enhancements

- [ ] GraphQL API endpoint alongside REST
- [ ] Redis Cluster for high availability
- [ ] Kubernetes Helm charts
- [ ] Event sourcing for audit trail
- [ ] Multi-tenant support
- [ ] WebSocket support (Socket.io or similar)
- [ ] Advanced monitoring (Prometheus, Grafana)
- [ ] OpenAPI/Swagger generation

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-03-26 | 1.0.0 | Initial documentation of monorepo v1 |

## References

- **README.md**: Quick start and architecture overview
- **CLAUDE.md**: Developer workflow and commands
- **DEPLOY.md**: Production deployment instructions
- **Code Standards**: `docs/code-standards.md`
- **System Architecture**: `docs/system-architecture.md`
