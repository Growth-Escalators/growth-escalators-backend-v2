# CURRENT_TASK.md

## Active task

**Wizmatch Staffing OS — controlled production launch is live for Jatin and Kanishk. Keep the
named-pilot roster restricted while completing the 48-hour read-only observation window.**

Work only in `/Users/jatinagrawal/repo-comparison/v2-wizmatch-phase0-trust` on
`codex/wizmatch-phase0-trust`. Preserve the unrelated dirty workspace at
`/Users/jatinagrawal/repo-comparison/v2`.

## Live production truth

- Production application commit `187c741` is deployed as Railway deployment
  `cd9c71ec-2f77-4a5d-b583-cdf3a55be9f5` with terminal `SUCCESS`.
- Additive migrations `0025`–`0028` were applied. Production now has 27 migration-journal rows
  and latest migration `0028`; the count is not 29 because two old journal entries were already
  absent from this historical database. All four reviewed pending entries applied successfully.
- Gate A, Gate B and Gate C are enabled for the two-ID named roster only. Pilot-all remains false.
- The four-skill/eight-alias SAP ABAP, SAP FICO, Java and JavaScript taxonomy was seeded
  idempotently. Existing legacy candidates remain unreviewed and excluded from matching.
- A retained non-PII QA PDF proves private dedicated-bucket storage, `r2://` persistence,
  five-minute signed access and failed public/unsigned access. Do not delete that audit object.
- Staffing reminders run once in the production web process at 09:17 IST Monday–Saturday. Legacy
  Wizmatch automation, sending, paid discovery, Google fallback and provider-backed X-Ray sourcing
  remain off. There is no worker service.
- Genuine companies, contacts, requirements, candidate evidence and commercial outcomes must be
  entered manually. Do not invent or backfill unknown facts.

## Qualification evidence

- Final release suite is green: TypeScript build; 46 Vitest files / 372 tests; admin production
  build; 17/17 Wizmatch Playwright scenarios; fresh 29-entry migration apply with 81 public and
  31 Wizmatch tables; gates-off bundle check; secret scan; and `git diff --check`.
- Authenticated production browser QA used Kanishk's Keychain-held admin credential without
  printing it. All 35 visible/direct Wizmatch routes passed desktop, tablet and 390px mobile
  checks. Staffing access, My Work, delivery, analytics and readiness APIs passed; unauthenticated
  access returned 401.
- Three production defects were repaired through tests, staging and production retest:
  dedicated private document bucket (`e38bdb9`), runtime staffing navigation/route access
  (`9bbb570`) and paid-provider X-Ray suppression (`187c741`).
- Production health is green and the database reports `ok`. No production row or document was
  deleted, and no fictional business outcome was created.

## Exact next action

Run the scheduled read-only pilot checks through the 48-hour window. Watch deployment health,
access denials, duplicate attempts, unattributed/overdue work, match anomalies, R2 failures,
reminder execution and finance reconciliation. Close an affected gate for a P0/P1; repair a P2
through tests and isolated staging before another production push.

- Heartbeat `wizmatch-15-minute-production-check` performs the 15-minute and one-hour follow-ups,
  then pauses/deletes itself.
- Cron `wizmatch-48-hour-pilot-monitor` runs read-only checks every six hours through
  `2026-07-16T06:12:00Z`, then performs the final check and pauses/deletes itself.

Do not add users, enable pilot-all, sending, paid providers, Google fallback, legacy automation,
automatic submissions, scraper schedules or a worker during this observation window.
