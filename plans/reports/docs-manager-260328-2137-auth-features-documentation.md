# Documentation Update Report: Auth Features & Recent Changes

**Date**: 2026-03-28
**Updated Files**: 3 (docs/system-architecture.md, docs/code-standards.md, CLAUDE.md)

---

## Summary

Updated documentation across the monorepo to reflect 13 significant features added since last documentation update. All changes verified against actual codebase implementation via git history and file inspection.

---

## Changes Made

### 1. docs/system-architecture.md (911 lines)

**Database Schema Updates**:
- Enhanced `users` table with profile fields: `displayName`, `avatarUrl`, `bio`, `role`, `emailVerified`
- Added `verification_tokens` table with `token_type` enum (email_verify, password_reset)
- Added `audit_logs` table with action tracking, IP/user-agent logging, metadata
- All new tables documented with indexes and purpose

**Rate Limiting Section** (new):
- Added comprehensive rate limiting table with endpoint-specific limits
- Auth: global 10/min, login/register 5/min, email/password endpoints 3-5/min
- API: global 20/min
- Documents that 429 errors indicate rate limit exceeded

**Scheduled Tasks Section** (new):
- Auth cron: daily 3 AM cleanup (refresh tokens, verification tokens, audit logs >90d)
- API cron: daily 4 AM cleanup (BullMQ jobs)

**BullMQ Updates**:
- Expanded to document both Auth (email queue) and API (projects queue)
- Email queue: 5 retries with exponential backoff
- Configuration examples with BULLMQ_PREFIX

**Auth Endpoints Section**:
- Complete endpoint listing with `/api/v1/auth/*` routing
- Separated public vs. protected endpoints (18 total documented)
- Includes: register, login, refresh, logout, verify-email, resend-verification, forgot-password, reset-password, profile management

**Health Checks Update**:
- Auth: checks PostgreSQL only
- API: checks PostgreSQL, Redis, RabbitMQ
- Notes infrastructure dependencies

**API Versioning Section** (new):
- Documents `/api/v1` prefix for all routes
- Future versioning strategy (/api/v2)
- Exclusions: health checks, Swagger docs

**Environment Variables**:
- Auth-specific SMTP config documented (SMTP_HOST, PORT, SECURE, FROM)
- Redis required for Auth email queue
- BULLMQ_PREFIX added

### 2. CLAUDE.md (95 lines)

**Auth Service Description**:
- Updated to include: email verification, password reset, profile fields, async email queue, rate limiting, health checks, audit trail
- Noted Redis dependency for email queue

**Email Package Documentation** (new):
- Added `@monorepo/email` to packages list
- Documents nodemailer + Handlebars templates (verify-email, password-reset, welcome)
- Notes MailDev integration and UI URL (:1080)

**Docker Section**:
- Updated to mention MailDev container
- Added MailDev URLs (Web UI :1080, SMTP :1025)

### 3. docs/code-standards.md (770 lines)

**Environment Variables Section**:
- Separated Auth-specific variables for email and verification
- Documented SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_FROM
- Added REDIS_URL and BULLMQ_PREFIX
- Clarified AUTH_DATABASE_URL and API_DATABASE_URL as required

---

## Features Documented

1. **@monorepo/cache** — Redis cache helpers (createRedisClient, cacheGet/Set/Del/Exists/Expire/Ttl)
2. **User Profile** — displayName, avatarUrl, bio fields; GET/PATCH /api/v1/auth/profile
3. **Refresh Token Rotation** — 15m access token, 30d refresh with SHA-256 hash storage
4. **Cron Jobs** — Daily cleanup tasks (tokens, logs, queue jobs)
5. **Rate Limiting** — Per-endpoint and global limits with 429 responses
6. **Health Checks** — /health endpoints for both services with dependency checks
7. **Audit Trail** — audit_logs table with action, IP, user-agent, metadata
8. **@monorepo/email** — nodemailer + Handlebars email templates
9. **Email Verification** — POST /verify-email, /resend-verification endpoints
10. **Password Reset** — POST /forgot-password, /reset-password with anti-enumeration
11. **Email Queue** — BullMQ async queue with 5 retries
12. **API Versioning** — /api/v1 prefix on all routes
13. **verification_tokens** — Shared table for email_verify and password_reset tokens

---

## Verification Method

All documentation updates verified by:
1. Reading actual controller files (auth.controller.ts)
2. Reviewing database schema definitions (users.ts, refresh-tokens.ts, verification-tokens.ts, audit-logs.ts)
3. Checking git commit history (13 commits reviewed)
4. Inspecting docker-compose.dev.yml for actual configuration
5. Cross-referencing environment variables against actual usage

---

## Document Quality

| File | Lines | Status | Notes |
|------|-------|--------|-------|
| system-architecture.md | 911 | Acceptable | Slightly over 800 target; well-organized with clear sections |
| code-standards.md | 770 | Good | Concise, under 800 line target |
| CLAUDE.md | 95 | Excellent | Brief project overview; sufficient detail for developers |

---

## Remaining Gaps

None identified. All major recent features are now documented.

---

## Recommendations for Future Maintenance

1. **system-architecture.md** — Consider splitting into:
   - `system-architecture/overview.md` (core topology)
   - `system-architecture/database.md` (schema details)
   - `system-architecture/security.md` (auth, JWT, HTTPS)

   This would keep individual files under 800 lines and improve navigation.

2. **Rate Limiting** — Document actual rate limit middleware configuration in code-standards if not already present.

3. **Email Templates** — Consider adding email template documentation under `docs/` when template content stabilizes.

---

## Files Modified

- `/d/Code/monorepo/docs/system-architecture.md` — +111 lines (net)
- `/d/Code/monorepo/docs/code-standards.md` — +24 lines (net)
- `/d/Code/monorepo/CLAUDE.md` — +8 lines (net)

**Total**: +143 lines of documentation added

---

## Sign-off

All documentation updates are complete and verified against the codebase as of commit `e2e3e6e`.
