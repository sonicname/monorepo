---
phase: 1
title: "Shared Packages - Database Schema, Contracts, Proto"
status: pending
effort: 1h
---

# Phase 1: Shared Packages

## Context Links
- Users schema: `packages/database/src/schema/auth/users.ts`
- Users repo: `packages/database/src/repositories/auth/users.repository.ts`
- Contracts: `packages/contracts/src/index.ts`
- Proto file: `packages/proto/proto/auth.proto`
- Proto types: `packages/proto/src/index.ts`

## Overview
Add role enum to database schema, role types to contracts, and role field to gRPC proto messages. These changes must be done first since both apps depend on these packages.

## Key Insights
- Drizzle ORM supports `pgEnum` for PostgreSQL enum types
- `UserRow` and `NewUserRow` are auto-inferred from schema -- adding the column auto-updates them
- Proto uses field numbers; add `role` as next available number in each message
- `@monorepo/contracts` currently has no auth types at all

## Requirements
- `userRoleEnum` pgEnum with values `admin`, `user`
- `role` column on users table, default `user`, not null
- Shared `UserRole` type and `AuthUser` type in contracts
- `role` field added to `VerifyTokenResponse` and `GetUserResponse` in proto

---

## Architecture

### Data Flow
```
DB (role column) -> Auth service (JWT + gRPC) -> Traefik header / gRPC response -> API service -> Web session
```

---

## Related Code Files

### Files to Modify
- `packages/database/src/schema/auth/users.ts` -- add pgEnum + role column
- `packages/contracts/src/index.ts` -- add UserRole, AuthUser types
- `packages/proto/proto/auth.proto` -- add role field to responses
- `packages/proto/src/index.ts` -- add role to TS interfaces

### Files to Create
None.

---

## Implementation Steps

### 1. Add role enum and column to users schema

In `packages/database/src/schema/auth/users.ts`:

```ts
import { pgTable, pgEnum, text, timestamp } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);

export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true })
    .notNull(),
});

export type UserRole = (typeof userRoleEnum.enumValues)[number]; // 'admin' | 'user'
export type UserRow = typeof usersTable.$inferSelect;
export type NewUserRow = typeof usersTable.$inferInsert;
```

Note: `UserRow` and `NewUserRow` auto-update since they are inferred from table definition.

### 2. Add auth types to contracts

In `packages/contracts/src/index.ts`, append:

```ts
export type UserRole = 'admin' | 'user';

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser & { createdAt: string };
};
```

### 3. Update proto file

In `packages/proto/proto/auth.proto`, add `role` field (next available field numbers):

```protobuf
message VerifyTokenResponse {
  bool valid = 1;
  string user_id = 2;
  string email = 3;
  string username = 4;
  string error = 5;
  string role = 6;       // <-- NEW
}

message GetUserResponse {
  bool found = 1;
  string user_id = 2;
  string email = 3;
  string username = 4;
  string role = 5;       // <-- NEW
}
```

### 4. Update proto TypeScript interfaces

In `packages/proto/src/index.ts`, add `role` to both response interfaces:

```ts
export interface VerifyTokenResponse {
  valid: boolean;
  userId: string;
  email: string;
  username: string;
  error: string;
  role: string;          // <-- NEW
}

export interface GetUserResponse {
  found: boolean;
  userId: string;
  email: string;
  username: string;
  role: string;          // <-- NEW
}
```

### 5. Rebuild packages

```bash
pnpm --filter @monorepo/database build
pnpm --filter @monorepo/contracts build
pnpm --filter @monorepo/proto build
```

### 6. Generate and run DB migration

```bash
pnpm db:generate:auth
pnpm db:push:auth
```

---

## Todo List
- [ ] Add `pgEnum` and `role` column to `users.ts`
- [ ] Export `UserRole` from database schema
- [ ] Add `UserRole`, `AuthUser`, `AuthResponse` to contracts
- [ ] Add `role` field to `VerifyTokenResponse` in proto
- [ ] Add `role` field to `GetUserResponse` in proto
- [ ] Update TypeScript interfaces in proto `index.ts`
- [ ] Build all three packages
- [ ] Generate and apply auth DB migration

## Success Criteria
- `pnpm --filter @monorepo/database build` succeeds
- `pnpm --filter @monorepo/contracts build` succeeds
- `pnpm --filter @monorepo/proto build` succeeds
- `pnpm db:push:auth` applies role column without errors
- Existing users get default role `user`

## Risk Assessment
- **Existing data**: `default('user')` ensures existing rows get a valid role on migration
- **Proto backward compat**: Adding new fields to proto is backward-compatible (unknown fields ignored by old clients)

## Security Considerations
- Role enum is server-side only; clients cannot set arbitrary role values
- Default role is `user` (least privilege)
