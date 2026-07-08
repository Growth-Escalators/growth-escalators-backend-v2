# CURRENT_TASK.md

## Active task

**CRM portal error hardening** — stop shared Growth/Wizmatch CRM pages from crashing when live API
data contains richer/non-string values, and make Wizmatch live operating pages degrade to readiness
signals instead of page-level 500 fallbacks when optional/newer Wizmatch tables are missing.

Scope is **pipeline stage normalization, admin frontend display/search hardening, route-level
error-boundary recovery, Wizmatch optional-schema API fallbacks, tests, browser smoke, and AI
context**. This task does not add schema, migrations, auto-outreach, automatic candidate
submission, worker/cron automation, package, or deployment config changes.

## Definition of done

- [x] Normalize pipeline stages so string stages and object stages like
  `{ id, name, color }` both render safely.
- [x] Preserve Growth string-stage compatibility while allowing Wizmatch object-stage pipelines.
- [x] Harden shared CRM frontend string/search/display paths against non-string API values.
- [x] Make the app error boundary reset on route changes and offer a dashboard recovery action.
- [x] Make Wizmatch workbench/dashboard/readiness/cost paths tolerate missing optional/newer
  Wizmatch tables with zeroed fallback/readiness data instead of frontend 500 fallback screens.
- [x] Add focused regression coverage for pipeline stage normalization and missing
  `wizmatch_discovery_runs` cost-guard usage.
- [x] Run backend build, full Vitest suite, admin build, browser smoke, diff check, and refresh AI
  brief.

## Next task

- [x] Browser-smoke 15 Wizmatch routes and 15 Growth routes with mocked authenticated sessions and
  production-like Wizmatch object-stage pipeline data.
- [ ] Log in with real Growth and Wizmatch users on localhost/live and manually confirm shared
  modules show the correct tenant data in both profiles once this branch is deployed to a
  production-like environment.
- [ ] Review Wizmatch AI Intelligence output after the missing production Wizmatch tables are
  present and real requirements/client signals/contact candidates exist.

## Production data verification on 2026-07-08 IST

Read-only Railway/Postgres aggregate inspection found:

- `wizmatch` tenant exists and is active.
- Contacts: 192 rows, all `source = wizmatch_github`, `status = lead`.
- Contact channels: 192 rows, all email, unverified.
- Candidates: 192 rows, all `source = github`, `availability_status = available`, latest update
  `2026-07-06T22:00:30.683Z`.
- Domain health: 3 rows from the bootstrap seed.
- Pipeline: 1 bootstrap pipeline.
- Deals, messages/inbox, tasks, email templates, WhatsApp templates, billing clients, invoices,
  payments, companies, job signals, placements, suppression list: 0 rows for Wizmatch.
- Newer branch tables were missing in production: `wizmatch_requirements`,
  `wizmatch_company_intelligence`, `wizmatch_contact_candidates`, and
  `wizmatch_discovery_runs`.
- Demo/test indicators were low in existing production rows: 1 contact matched demo/test text,
  0 `example.*` contact channels, 0 demo candidate sources.

Conclusion: production Wizmatch is not just dummy data because the 192 GitHub-sourced
candidate/contact rows look like real sourced data, but it is not yet business-ready/client-ready.
The CRM operating modules that drive clients and revenue are effectively empty, and the newest
contact-intelligence/requirements persistence tables are not applied in production.
