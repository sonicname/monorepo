# Code Standards & Conventions

Guidelines for maintaining consistency across the monorepo.

## TypeScript Configuration

### NestJS Apps (apps/api, apps/auth)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Key Settings**:
- `strict: true` — All strict checks enabled
- `emitDecoratorMetadata` — Required for NestJS dependency injection
- `isolatedModules` — Each file compiles independently
- `nodenext` — Node.js ESM support with proper extension handling

### Shared Packages (packages/*)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "strict": true,
    "skipLibCheck": true
  }
}
```

**Key Settings**:
- `ES2022` module — Modern bundler target
- `bundler` resolution — Cleaner import paths
- `declaration: true` — Generate `.d.ts` files
- Output to `dist/` directory

### React App (apps/web)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true
  },
  "paths": {
    "~/*": ["./app/*"]
  }
}
```

**Key Settings**:
- `jsx: react-jsx` — New JSX transform
- Path alias `~/*` for app directory

---

## File Naming Conventions

### Directory Names
- Use **kebab-case** for directories: `src/auth-grpc/`, `src/projects/`, `src/runtime-config/`
- Group related files in dedicated folders

### File Names
- Use **kebab-case** for all source files
- Descriptive names that indicate purpose

**Examples**:
```
✓ jwt-auth.guard.ts
✓ runtime-config.service.ts
✓ projects-queue.processor.ts
✓ publish-projects-sync.dto.ts
✗ jwtAuthGuard.ts (use kebab-case)
✗ RuntimeConfigService.ts (wrong convention)
```

### Class Names
- Use **PascalCase** for exported classes
- Match file name convention (PascalCase class in kebab-case file)

**Examples**:
```typescript
// jwt-auth.guard.ts
export class JwtAuthGuard { }

// projects.service.ts
export class ProjectsService { }
```

### Constants
- Use **SCREAMING_SNAKE_CASE** for top-level constants
- Use **camelCase** for configuration objects

**Examples**:
```typescript
// constants
export const PROJECTS_QUEUE_NAME = 'projects';
export const DEFAULT_JOB_ATTEMPTS = 3;

// config objects
export const jobDefaults = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
};
```

---

## Module Patterns

### Feature Module Structure

Every feature module follows this pattern:

```
feature/
├── feature.module.ts          # Module declaration
├── feature.controller.ts      # HTTP endpoints
├── feature.service.ts         # Business logic
├── dto/
│   ├── create-feature.dto.ts  # Request/response DTOs
│   └── update-feature.dto.ts
├── guards/
│   └── feature-auth.guard.ts  # Middleware/guards
└── feature.spec.ts            # Unit tests
```

### Global Module Registration

**Global modules** are registered once in `app.module.ts`:

```typescript
@Module({
  imports: [
    DatabaseModule,      // @Global() - available everywhere
    RuntimeConfigModule, // @Global() - available everywhere
  ],
})
export class AppModule {}
```

**Usage**: No need to import global modules in feature modules:

```typescript
// ✓ Direct injection
constructor(private readonly db: DatabaseService) {}

// ✗ Don't do this — global modules already available
@Module({
  imports: [DatabaseModule], // Unnecessary
})
```

### Import Order

Follow strict import ordering in all files:

```typescript
// 1. External packages (Node.js + npm)
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

// 2. Workspace packages (@monorepo/*)
import { validateRuntimeEnv } from '@monorepo/config';
import { PROJECTS_QUEUE_NAME } from '@monorepo/constants';

// 3. Local imports (relative)
import { UsersRepository } from '../repositories/users.repository';
import { AuthService } from './auth.service';

// 4. Type imports (after other imports)
import type { User } from '../types';
```

---

## Naming Conventions by Type

### Services
- Suffix: `.service.ts`
- Class name: `{Feature}Service`
- Examples: `AuthService`, `ProjectsService`, `DatabaseService`

### Controllers
- Suffix: `.controller.ts`
- Class name: `{Feature}Controller`
- Examples: `AuthController`, `ProjectsController`

### Guards/Middleware
- Suffix: `.guard.ts`
- Class name: `{Name}Guard`
- Examples: `JwtAuthGuard`, `AdminGuard`

### Strategies (Passport)
- Suffix: `.strategy.ts`
- Class name: `{Name}Strategy`
- Examples: `JwtStrategy`, `LocalStrategy`

### DTOs (Data Transfer Objects)
- Suffix: `.dto.ts`
- Class name: `{Action}{Entity}Dto`
- Examples: `RegisterDto`, `LoginDto`, `CreateProjectDto`

### Repositories
- Suffix: `.repository.ts`
- Class name: `{Entity}Repository`
- Examples: `UsersRepository`, `ProjectsRepository`

### Interceptors
- Suffix: `.interceptor.ts`
- Class name: `{Name}Interceptor`
- Examples: `LoggingInterceptor`

### Pipes
- Suffix: `.pipe.ts`
- Class name: `{Name}Pipe`
- Examples: `ValidationPipe`

### Test Files
- Suffix: `.spec.ts` (unit) or `.e2e-spec.ts` (e2e)
- Location: Same directory as source or `test/` folder
- Examples: `auth.service.spec.ts`, `app.e2e-spec.ts`

---

## Code Organization Rules

### File Size Limits
- **Target**: < 200 lines per file
- **Maximum**: 300 lines before splitting
- **Rationale**: Better readability, easier testing, faster navigation

### Single Responsibility Principle
- One class/service per file
- One primary purpose per module
- Split large services into focused components

### Dependency Injection Pattern

**Always use constructor injection**:

```typescript
// ✓ Constructor injection
@Injectable()
export class ProjectsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: RuntimeConfigService,
  ) {}
}

// ✗ Avoid manual instantiation
const service = new ProjectsService();

// ✗ Avoid property injection
@Injectable()
export class ProjectsService {
  @Inject() private db: DatabaseService;
}
```

### Error Handling

**Use NestJS HttpException for API errors**:

```typescript
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

// Bad request
throw new BadRequestException('Email already registered');

// Unauthorized
throw new UnauthorizedException('Invalid credentials');

// Internal error
throw new InternalServerErrorException('Database connection failed');
```

**Service layer throws plain Error**:

```typescript
// For business logic errors
if (!user) {
  throw new Error('User not found');
}
```

**Always include error context**:

```typescript
throw new BadRequestException({
  message: 'Validation failed',
  errors: {
    email: 'Invalid email format',
  },
});
```

### Logging

Use NestJS Logger:

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async createUser(dto: CreateUserDto) {
    this.logger.log(`Creating user: ${dto.email}`);
    try {
      // ...
    } catch (error) {
      this.logger.error(
        `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
      );
      throw error;
    }
  }
}
```

---

## Database Conventions

### Repository Methods

Use consistent naming for repository methods:

```typescript
// Query operations
findById(id: string)
findByEmail(email: string)
findFirst(criteria: object)
list(options?: ListOptions)
count()

// Mutation operations
create(data: CreateDTO)
update(id: string, data: UpdateDTO)
delete(id: string)

// Bulk operations
bulkCreate(data: CreateDTO[])
deleteMany(criteria: object)
```

### Schema Naming

**Table names**: plural, snake_case
```typescript
export const usersTable = pgTable('users', { ... });
export const projectsTable = pgTable('projects', { ... });
```

**Column names**: snake_case
```typescript
email: text('email').unique().notNull(),
passwordHash: text('password_hash').notNull(),
createdAt: timestamp('created_at').notNull(),
```

### Timestamps

All tables should include:
```typescript
createdAt: timestamp('created_at').defaultNow().notNull(),
updatedAt: timestamp('updated_at').defaultNow().notNull(),
```

---

## API Conventions

### HTTP Status Codes

```typescript
// Success
200 OK — Request succeeded
201 Created — Resource created
204 No Content — Success, no response body

// Client errors
400 Bad Request — Invalid input
401 Unauthorized — Missing/invalid auth
403 Forbidden — Lacks permission
404 Not Found — Resource not found
409 Conflict — Resource already exists

// Server errors
500 Internal Server Error — Unexpected error
503 Service Unavailable — Dependency unavailable
```

### Request/Response Format

**Consistent response envelope**:

```typescript
// Success
{
  "ok": true,
  "data": { /* ... */ }
}

// Error
{
  "ok": false,
  "error": {
    "message": "Email already registered",
    "code": "DUPLICATE_EMAIL"
  }
}
```

### Route Naming

**RESTful conventions**:

```typescript
// Collections
GET /api/projects           // List all
POST /api/projects          // Create

// Resources
GET /api/projects/:id       // Get one
PATCH /api/projects/:id     // Update
DELETE /api/projects/:id    // Delete

// Actions
POST /api/projects/sync     // Custom action
GET /api/projects/queue     // Query status
```

---

## Testing Standards

### Test File Location

```
src/
├── projects/
│   ├── projects.service.ts
│   ├── projects.service.spec.ts    // Unit test
│   └── projects.controller.ts
test/
└── app.e2e-spec.ts                 // E2E test
```

### Test Naming Convention

```typescript
describe('ProjectsService', () => {
  describe('list', () => {
    it('should return all projects', async () => {
      // Arrange
      const expected = [{ id: '1', name: 'Project 1' }];

      // Act
      const result = await service.list();

      // Assert
      expect(result).toEqual(expected);
    });

    it('should handle empty list', async () => {
      // ...
    });
  });
});
```

### Coverage Targets

| Module | Target | Notes |
|--------|--------|-------|
| Services | > 80% | Critical business logic |
| Controllers | > 70% | Happy path + error cases |
| Utilities | > 90% | Pure functions |
| E2E | Key flows | Happy path + common errors |

---

## Code Review Checklist

Before submitting PR, verify:

- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] All tests pass (`pnpm test`, `pnpm test:e2e`)
- [ ] Code formatted with Prettier (`pnpm format`)
- [ ] No console.log, only Logger
- [ ] Error handling included (try/catch or NestJS exceptions)
- [ ] File names follow kebab-case convention
- [ ] Classes/constants follow naming conventions
- [ ] Imports sorted correctly
- [ ] No hardcoded secrets or credentials
- [ ] Database changes include migrations
- [ ] Comments explain "why", not "what"

---

## Formatting Rules

### Prettier Configuration

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
```

**Run formatting**:
```bash
pnpm format
```

### Code Comments

**Good comments explain "why"**:

```typescript
// ✓ Explains business reason
// Users must hash passwords before storage for security
const hashedPassword = await bcrypt.hash(password, 12);

// ✗ States obvious facts
// Hash the password
const hashedPassword = await bcrypt.hash(password, 12);
```

**Comment style**:
```typescript
// Single-line comment for brief notes

/**
 * Multi-line JSDoc for exported functions/classes
 *
 * @param {string} email - User email address
 * @returns {Promise<User>} The created user
 */
export async function createUser(email: string): Promise<User> {
  // ...
}
```

---

## Security Standards

### Secrets Management
- Never commit `.env` files (use `.env.example` instead)
- Never log sensitive data (passwords, tokens, API keys)
- Always mask connection strings in logs: `maskConnectionUrl(url)`

### Password Hashing
- Use bcrypt with 12 rounds minimum
- Never store plaintext passwords

### JWT & Refresh Token Configuration
- Always use Bearer token scheme for access tokens
- Access token expiry: **15 minutes** (short-lived)
- Refresh token expiry: **30 days** (long-lived, stored as SHA-256 hash)
- Refresh tokens use **rotation** — each use revokes the old token and issues a new pair
- Sign with strong secret (minimum 32 characters)
- Never store raw refresh tokens in the database — only SHA-256 hashes

### CORS & Security Headers
Handled by Traefik in production. For direct service access:

```typescript
app.enableCors({
  origin: process.env.WEB_ORIGIN,
  credentials: true,
});
```

---

## Environment Variables

### Naming Convention
- Uppercase with underscores: `DATABASE_URL`, `JWT_SECRET`, `API_PORT`
- Service-specific prefix: `AUTH_PORT`, `API_PORT`, `WEB_PORT`

### Required vs Optional

**Required** (must be set):
```
NODE_ENV (development|production)
DATABASE_URL
JWT_SECRET
SESSION_SECRET
```

**Optional** (has defaults):
```
API_PORT (default: 3001)
AUTH_PORT (default: 3002)
WEB_PORT (default: 5173)
BULLMQ_ENABLED (default: true)
RABBITMQ_ENABLED (default: true)
```

### Validation

Always validate at startup:

```typescript
const config = getValidatedRuntimeEnv();
if (!config) {
  throw new Error('Missing required environment variables');
}
```

---

## Version Control

### Commit Message Format

Use conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Examples**:
```
feat(auth): add JWT token refresh endpoint
fix(api): handle null project status gracefully
docs(setup): update database initialization steps
refactor(queues): simplify BullMQ configuration
test(services): increase ProjectsService coverage to 85%
```

**Rules**:
- No AI references in messages
- Keep subject under 50 characters
- Reference issues: `Fixes #123`
- One commit per logical change

### Branch Naming

```
feature/feature-name
fix/bug-description
docs/documentation-topic
refactor/component-name
```

---

## Build & Deployment

### Build Verification

Before pushing, verify:

```bash
# Type check all apps
pnpm typecheck

# Run tests
pnpm test
pnpm test:e2e

# Build all packages and apps
pnpm build

# Check formatting
pnpm format --check
```

### Docker Best Practices

- Use multi-stage builds
- Alpine base images (Node 24-alpine)
- Minimize layer count
- Cache dependencies
- No secrets in images

---

## Documentation Standards

### README for Each App/Package

Include:
- Brief description
- Commands to run locally
- Environment variables
- Key endpoints/exports
- Testing instructions

### Code Examples

Always provide working examples:

```typescript
// ✓ Complete, runnable example
const result = await service.findById('uuid-123');
console.log(result.email);

// ✗ Incomplete example
const result = await service.findById(...);
```

### Inline Documentation

Document complex logic, not obvious code:

```typescript
// ✓ Explains non-obvious choice
// Use exponential backoff to avoid overwhelming the queue during retries
const delay = Math.pow(2, attemptNumber) * 1000;

// ✗ Obvious documentation
// Calculate the delay
const delay = Math.pow(2, attemptNumber) * 1000;
```
