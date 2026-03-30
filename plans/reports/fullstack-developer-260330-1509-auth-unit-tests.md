# Phase Implementation Report

### Executed Phase
- Phase: auth-unit-tests
- Plan: none (direct task)
- Status: completed

### Files Modified
- `apps/auth/package.json` — added `moduleNameMapper`, `transformIgnorePatterns`, and ts-jest inline tsconfig override (`module: commonjs`, `moduleResolution: node`, `resolvePackageJsonExports: false`, `diagnostics: false`)

### Files Created
- `apps/auth/src/audit/audit.service.spec.ts` — 6 tests
- `apps/auth/src/cron/token-cleanup.service.spec.ts` — 7 tests
- `apps/auth/src/auth-grpc/auth-grpc.controller.spec.ts` — 11 tests
- `apps/auth/src/__mocks__/monorepo-database-auth.ts` — Jest stub for `@monorepo/database/*`
- `apps/auth/src/__mocks__/monorepo-proto.ts` — Jest stub for `@monorepo/proto`

### Tasks Completed
- [x] AuditService: logs full entry with all fields
- [x] AuditService: coerces missing optional fields to null
- [x] AuditService: omits requestId from metadata when absent
- [x] AuditService: swallows DB errors gracefully (Error and non-Error)
- [x] TokenCleanupService: deletes expired refresh tokens
- [x] TokenCleanupService: deletes expired verification tokens
- [x] TokenCleanupService: deletes audit logs older than 90 days (exact arg)
- [x] TokenCleanupService: continues remaining cleanups when any one step throws
- [x] TokenCleanupService: does not throw when all three cleanups fail
- [x] AuthGrpcController.verifyToken: returns valid payload for valid JWT
- [x] AuthGrpcController.verifyToken: defaults role to "user" when absent from payload
- [x] AuthGrpcController.verifyToken: returns invalid + error message for expired JWT
- [x] AuthGrpcController.verifyToken: returns generic error for non-Error throws
- [x] AuthGrpcController.getUser: returns user data when found
- [x] AuthGrpcController.getUser: returns not-found response when missing
- [x] AuthGrpcController.getProfile: returns full profile when found
- [x] AuthGrpcController.getProfile: returns empty profile constant when missing
- [x] AuthGrpcController.getProfile: coerces null optional fields to empty strings
- [x] AuthGrpcController.updateProfile: returns updated profile on success
- [x] AuthGrpcController.updateProfile: maps empty strings to null on update call
- [x] AuthGrpcController.updateProfile: returns failure response when user not found

### Tests Status
- Type check: skipped (diagnostics: false in ts-jest, avoids cross-package tsconfig conflicts)
- Unit tests: 24/24 pass

### Issues Encountered
1. All `@monorepo/*` packages are `"type": "module"` emitting ESM — Jest (CJS runtime) cannot load them directly.
2. ts-jest inherits `module: nodenext` from auth's tsconfig, which emits ESM output even for `.ts` source.

**Resolution**: Two-part fix —
- `moduleNameMapper` redirects `@monorepo/database/*` and `@monorepo/proto` to lightweight CJS-compatible stub files in `src/__mocks__/`. No real DB/proto code is needed since `DatabaseService` is fully mocked via `Test.createTestingModule` in every test.
- ts-jest inline tsconfig override forces `module: commonjs` + `moduleResolution: node` + `resolvePackageJsonExports: false` so all compiled output is CJS and package.json `exports` fields are not followed (allowing CJS fallback `main` entries in transitive deps like drizzle-orm/zod).

### Next Steps
- The `transformIgnorePatterns: []` setting causes ts-jest to attempt to transform all node_modules. For a large test suite this would slow down significantly — consider narrowing to only the affected monorepo packages if/when more tests are added.
- `diagnostics: false` suppresses ts-jest type errors; a dedicated `tsconfig.test.json` (with `module: commonjs`) would be cleaner long-term.
