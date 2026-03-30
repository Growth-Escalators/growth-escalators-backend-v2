# Overnight Autonomous Run Report

> **Date:** 2026-03-29
> **Status:** COMPLETE

---

## Summary Table

| Task | Status | Notes |
|------|--------|-------|
| **PHASE 1 — Constants & Config Cleanup** | | |
| 1.1 Centralized constants file | DONE | Created `src/config/constants.ts` with 25 env-first constants. Updated 7 files to import from it. |
| 1.2 Cron error boundaries | DONE | All 7 cron jobs already had try/catch. Verified, no changes needed. |
| 1.3 Worker error boundaries | DONE | Added try/catch in `recoverStuckJobs()`, `processSequenceSteps()`, `processDueSocialPosts()`. |
| 1.4 Graceful shutdown | DONE | SIGTERM/SIGINT handler: closes HTTP server, Socket.io, waits 10s, closes DB pool. |
| **PHASE 2 — Test Setup** | | |
| 2.1 Vitest setup | DONE | Installed vitest + coverage. Created `vitest.config.ts`. Added `test`, `test:watch`, `test:coverage` scripts. |
| 2.2 Billing tests | DONE | 9 tests: CGST/SGST, IGST, no-tax, paise conversion, invoice number format, financial year. |
| 2.3 Idempotency tests | DONE | 5 tests: first call passes, duplicate blocked, different IDs pass, nested body paths, empty body. |
| 2.4 Scoring tests | DONE | 25 tests: all scoring criteria, tier thresholds, combined scoring, determineSequence, buildDealTitle. |
| **PHASE 3 — Migration Safety** | | |
| 3.1 Migration script | DONE | Created `src/scripts/migrate.ts` — standalone migration runner with exit codes. |
| 3.2 railway.json update | DONE | Start command: `node dist/scripts/migrate.js && node dist/index.js`. |
| 3.3 Remove migrate from index | DONE | Removed `migrate()` call and import from `src/index.ts`. |
| **PHASE 4 — Worker Separation** | | |
| 4.1 Worker entry point | DONE | Created `src/worker.ts` — runs all 3 workers + 7 cron jobs, no HTTP server. |
| 4.2 Clean up index.ts | DONE | Removed worker imports, cron imports, and all cron job registrations from index.ts. |
| 4.3 Railway docs | DONE | Comment in railway.json. See NEEDS_REVIEW for manual steps. |
| **PHASE 5 — Structured Logging** | | |
| 5.1 Install pino | DONE | pino (production), pino-pretty (dev). |
| 5.2 Logger utility | DONE | `src/utils/logger.ts` — JSON in production, pretty in dev. Console.error-compatible wrapper. |
| 5.3 Request ID middleware | DONE | Generates UUID per request, attaches to `req.requestId`, sets `X-Request-ID` response header. |
| 5.4 console.error in services | DONE | Replaced in 9 service files: clickup, brevo, sodEod, email, slack, booking, spend, blocker, capi. |
| 5.5 console.error in routes | DONE | Replaced in 10 route files: cashfree, social, auth, contacts, discover, webhooks, deals, clickup, capi, sequences. Also 2 utils: clickupTasks, audit. |
| **PHASE 6 — Health Check** | | |
| 6.1 Enhanced /health | DONE | Returns `status` (healthy/degraded/unhealthy), `checks.database`, `checks.stuckJobs` (count of jobs processing >2h), `checks.lastWebhook` (last inbound WA timestamp, stale if >24h). |
| **PHASE 7 — Code Quality** | | |
| 7.1 Strict TS checks | NEEDS_REVIEW | `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` produced 173 errors (threshold: 20). Reverted. |
| 7.2 Audit TODOs | DONE | No TODO/FIXME/HACK/XXX comments found in the codebase. Clean. |
| 7.3 Meta API versions | DONE | 1 inconsistency found. See below. |

---

## NEEDS_REVIEW

### 1. Railway worker service (Phase 4.3)
Railway dashboard needs a **second service** added manually. Cannot be done from code.
- **Command:** `node dist/worker.js`
- **Purpose:** Runs all background workers (sequenceWorker, socialPostWorker, stuckJobWorker) and all 7 cron jobs
- **Current state:** Workers and crons were removed from `index.ts`. Until the second service is created, workers/crons will NOT run.
- **Quick rollback:** If you need workers running in the same process temporarily, import `./worker` at the bottom of `index.ts`.

### 2. TypeScript strict checks (Phase 7.1)
Adding `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` to tsconfig.json produced **173 errors**. These are real type-safety improvements but require significant refactoring across the codebase (mostly adding `?.` and `!` for array index access and explicit `undefined` handling). Recommend tackling in a dedicated session.

### 3. Meta Graph API version inconsistency (Phase 7.3)
| File | Line | Version |
|------|------|---------|
| src/config/constants.ts | 29 | v19.0 |
| src/services/metaCapi.ts | 7 | v19.0 |
| src/routes/social.ts | 11, 451, 456, 461, 504, 509 | v19.0 |
| src/routes/reports.ts | 8, 216, 226 | v19.0 |
| src/routes/cashfree.ts | 203 | v19.0 |
| src/routes/ads.ts | 5 | v19.0 |
| src/routes/inbox.ts | 105, 170 | v19.0 |
| **src/routes/messages.ts** | **134** | **v21.0** |

`src/routes/messages.ts:134` uses **v21.0** while all other files use **v19.0**. This may be intentional (WhatsApp Cloud API versioning) or accidental. Verify before standardizing.

---

## Manual Steps Required

1. **Create Railway worker service** — In Railway dashboard, add a new service running `node dist/worker.js` with the same env vars as the web service. Without this, cron jobs and background workers will not run.
2. **Verify messages.ts API version** — Check if v21.0 for WhatsApp messages endpoint is intentional.

---

## Test Results

```
 RUN  v4.1.2

 Test Files  3 passed (3)
      Tests  39 passed (39)
   Duration  223ms

 Files:
  - src/__tests__/billing.test.ts     (9 tests)
  - src/__tests__/idempotency.test.ts (5 tests)
  - src/__tests__/scoring.test.ts     (25 tests)
```

---

## TypeScript Check

```
$ npx tsc --noEmit
(no errors)
```

0 errors with current tsconfig (strict: true, without noUncheckedIndexedAccess/exactOptionalPropertyTypes).

---

## What Was NOT Changed

- **Database schema** (`src/db/schema.ts`) — untouched
- **Existing migrations** (`src/db/migrations/`) — untouched
- **RBAC middleware** (`src/middleware/rbac.ts`) — untouched
- **Auth logic** (`src/middleware/auth.ts`, `src/routes/auth.ts`) — only logger import added, no logic changes
- **Payment handlers** (`src/routes/cashfree.ts`) — only logger import added, no logic changes
- **Webhook handlers** (`src/routes/webhooks.ts`) — only logger import added, no logic changes

---

## Files Created

| File | Purpose |
|------|---------|
| `src/config/constants.ts` | Centralized env-first constants |
| `src/utils/logger.ts` | Pino logger with console.error-compatible API |
| `src/worker.ts` | Standalone worker process (crons + background jobs) |
| `src/scripts/migrate.ts` | Standalone migration runner |
| `src/__tests__/billing.test.ts` | GST calculation tests |
| `src/__tests__/idempotency.test.ts` | Webhook dedup middleware tests |
| `src/__tests__/scoring.test.ts` | Lead qualification scoring tests |
| `vitest.config.ts` | Vitest configuration |
| `OVERNIGHT_REPORT.md` | This report |

## Files Modified

| File | Changes |
|------|---------|
| `src/index.ts` | Removed migrations, workers, crons. Added request ID middleware, graceful shutdown. |
| `src/db/index.ts` | Exported `pool` for graceful shutdown |
| `src/utils/clickupSlack.ts` | Import constants instead of hardcoded values |
| `src/utils/clickupTasks.ts` | Import constants, use logger |
| `src/utils/audit.ts` | Use logger |
| `src/services/spendAlertService.ts` | Import constants, use logger |
| `src/services/blockerAlertService.ts` | Import constants, use logger |
| `src/services/sodEodService.ts` | Import constants, use logger |
| `src/services/clickupService.ts` | Import constants, use logger |
| `src/services/recurringInvoiceService.ts` | Import COMPANY_GSTIN from constants |
| `src/services/brevoTemplateService.ts` | Use logger |
| `src/services/emailService.ts` | Use logger |
| `src/services/slackService.ts` | Use logger |
| `src/services/bookingService.ts` | Use logger |
| `src/services/metaCapi.ts` | Use logger |
| `src/workers/stuckJobWorker.ts` | Added try/catch error boundary |
| `src/workers/sequenceWorker.ts` | Added try/catch error boundary |
| `src/workers/socialPostWorker.ts` | Added try/catch error boundary |
| `src/routes/healthRoute.ts` | Enhanced with stuckJobs + lastWebhook checks |
| `src/routes/*.ts` (10 files) | Added logger import, replaced console.error |
| `railway.json` | Updated start command with migration step |
| `package.json` | Added vitest, pino, test scripts |

---

## Recommended Next Steps

1. **Create the Railway worker service** (manual) — this is the highest priority as workers/crons won't run until done
2. **Fix messages.ts v21.0** — either standardize to v19.0 or document why it's different
3. **Tackle the 173 strict TS errors** in a dedicated session — enables `noUncheckedIndexedAccess` for better null safety
4. **Add more tests** — current coverage is focused on pure logic (billing, scoring, idempotency). Next priority: route-level integration tests with supertest
5. **Consider centralizing the remaining hardcoded `META_API_BASE`** in social.ts, reports.ts, ads.ts to use the constant from `src/config/constants.ts`
