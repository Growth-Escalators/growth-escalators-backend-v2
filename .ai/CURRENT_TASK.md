# CURRENT_TASK.md

## Active task

**Wizmatch Staffing OS — a controlled Gate A–C pilot is running on an ISOLATED Railway `staging`
environment. Local implementation and release-integrity review are complete. Staging holds its own
Postgres (`Postgres-Bhky`, full journal 0000–0028 applied) and a `web` service (`web-staging`)
running this worktree, healthy, with Gate A/B/C flags ON, sending + paid-discovery + background jobs
OFF. Staging URL: https://web-staging-staging-1d24.up.railway.app.**

**Gates A and B are exercised with fictional records and DB-verified. Gate A is now COMPLETE with
REAL relationship/attribution records: Person A → SAP requirement and Person B → Java requirement,
each with a company-contact relationship, primary-source attribution, account-owner + recruiter
assignments, dated next action + SLA, moved to `qualifying`. The exposed staging pilot password has
been rotated (new value never printed/stored). The exact next action is Gate C, which is BLOCKED on
staging R2 (consent/RTR/submission documents) and is NOT authorized yet — awaiting separate
staging-R2 approval.**

Work only in `/Users/jatinagrawal/repo-comparison/v2-wizmatch-phase0-trust` on
`codex/wizmatch-phase0-trust`. Preserve the unrelated dirty workspace at
`/Users/jatinagrawal/repo-comparison/v2`.

**Production is untouched:** nothing from this branch has been pushed to a remote, deployed to
production, applied to the production database, sent, spent, or written to production data. Staging
(a separate isolated environment) HAS been created, migrated, deployed and populated with fictional
pilot data, and the staging pilot login password was rotated — none of which affects production.

### Verified local release candidate

- Phase 0 trust/hardening and Gate A: `1997e31`.
- Gate B canonical skills/matching: `a5ac3e8`.
- Gate C delivery/commercial close: `48b1a88`.
- Delivery reference-integrity repair: `605d6cd`.
- Additive migrations `0025`–`0028`; no destructive SQL found.
- `npm run build` passed.
- `npm test` passed: 43 files / 349 tests.
- `npm run admin:build` passed.
- Wizmatch Playwright passed 16/16 mocked Chromium scenarios.
- Production-off bundle hid Gate A/B/C navigation and redirected guarded routes.

### Fresh-apply migration fixes (committed as `a810d08`, UNPUSHED, under guardrail review)

Applying the full journal to a fresh DB exposed two pre-existing, from-scratch-only defects in the
committed chain (production was migrated incrementally and is unaffected). Both were fixed additively
and are prod-safe — the drizzle node-postgres migrator compares each journal entry's `when` only
against the newest applied migration's `created_at`, so neither re-runs on a production deploy, and
both are no-ops if they ever did. No resulting schema shape changed; no snapshot/`db:generate` drift.

- `src/db/migrations/0008_great_romulus.sql`: `0007` (an idempotent retrofit superset) already
  creates `social_accounts`/`social_posts`, the `billing_clients`/`messages` columns, and the 3
  social FK constraints. `0008` re-did them bare → guarded all 8 (CREATE TABLE IF NOT EXISTS,
  ADD COLUMN IF NOT EXISTS, and `DO $$ … pg_constraint …$$` blocks matching `0009`'s own pattern).
- `src/db/migrations/0014_brevo_email_templates_seed.sql`: used `ON CONFLICT ON CONSTRAINT
  email_templates_tenant_name_idx`, but that name is a unique INDEX (from `0003`), not a
  constraint, so it fails from scratch. Switched all 5 to `ON CONFLICT (tenant_id, name)` — the
  column-inference form the file's own comment already documented.

These two files are committed to the branch as `a810d08` (local only, UNPUSHED). Because they edit
already-applied migrations — an `AGENTS.md` guardrail path — `a810d08` is under review in
`docs/reviews/wizmatch-migration-guardrail-review-2026-07-13.md`. Do NOT push it (or `main`) until
the migration owner chooses a documented exception or a safer replacement (revert + baseline-dump
for fresh installs).

### Same-day execution sequence — pause at every guarded action

1. Obtain explicit approval to create isolated Railway `staging` and an empty Postgres instance.
   **DONE** — environment `staging` (id `6aa742f6-38c1-4c3e-8471-6ec5fecea027`) and empty managed
   Postgres `Postgres-Bhky` (id `a78f7108-45b1-46c8-bd8e-682edae2ff1f`) created via
   `railway add --database postgres`. Not forked from production.
2. Verify staging has no production database/data, worker, sending, paid-provider or staffing flags.
   **DONE (at creation)** — `Postgres-Bhky` uses its own private domain `postgres-bhky.railway.internal`
   and its own dedicated volume `postgres-volume-STmx`; no reference to the production Postgres.
   (At this point staging had no `web` service and no variables; step 4 later added `web-staging`
   with Gate A/B/C ON and sending/paid OFF — see below.)
3. Obtain separate approval to apply the complete migration journal to staging.
   **DONE** — applied the full journal (0000–0028, 29 entries) to `Postgres-Bhky` with the drizzle
   node-postgres migrator (equivalent to `src/scripts/migrate.ts`; longer connection timeout +
   resume-on-drop retry over the public proxy). Verified: `drizzle.__drizzle_migrations` = 29 rows,
   81 public base tables, 31 `wizmatch_*` tables, and Gate A/B/C tables present
   (`wizmatch_requirements`, `wizmatch_placements`, `wizmatch_requirement_contacts`,
   `wizmatch_staffing_events`, `wizmatch_task_links`). Required the two fresh-apply fixes above.
   (At migration time staging still had no `web` service or env vars; step 4 added `web-staging`.)
4. Obtain separate approval to deploy this clean worktree directly to staging.
   **DONE** — service `web-staging` (id `e7f073ec-4835-4fbb-ad1c-17f0f5bb17f6`) created in staging;
   `railway up` deployment `964770e6-a8cf-4f9f-840a-670e13b1d7a4` reached `SUCCESS`. Fresh
   staging-only secrets (generated `JWT_SECRET`, `DATABASE_URL` reference to `Postgres-Bhky`);
   `NODE_ENV=production`; `DISABLE_BACKGROUND_JOBS=true`; Gate A/B/C server+Vite flags ON in
   staging; sending/paid/google-fallback OFF; `CRM_EXTRA_HOST` set for the staging domain.
   Verified `/health`=200 `database:ok`, admin SPA served. No production secret copied; no push.
5. Run the fictional Company A / Person A SAP / Person B Java workflow through match, consent,
   submission record, interview, offer, placement, invoice link and collection reporting.
   Staging admin `pilot@wizmatch.test` (wizmatch tenant) bootstrapped then password-ROTATED (new
   value never printed/stored; old sessions revoked). `CORS_EXTRA_ORIGIN` set so the SPA loads on
   the staging host. **Gate A COMPLETE & DB-verified with REAL records:** `Company A (Pilot)` seeded
   (deterministic score 54/watch); two distinct requirements `SAP ABAP Consultant (Person A)` +
   `Java Backend Developer (Person B)` both attributed to the one company_id; hiring contacts
   Person A + Person B linked (hiring_manager, source); SAP→Person A and Java→Person B primary-source
   attribution; account-owner + recruiter assignments on each; dated next action + SLA on each; both
   moved draft→`qualifying` (draft→accepted correctly blocked by the transition guard). Company 360 /
   Hiring Contact 360 / Requirement 360 / timelines (14 staffing events) all verified; isolation
   confirmed (each requirement has exactly its own source contact + assignments). Requirement PDF
   sheets need R2 (intentionally unset → honest "R2 not configured"; the requirement record still
   persists). **Gate B DONE & DB-verified:** 2 fictional candidates imported; deterministic matching
   routed Rahul→SAP(Person A) and Priya→Java(Person B); previews scored without persisting (a score
   is not a shortlist); Rahul shortlisted with `wizmatch_submissions/placements/offers = 0` (a
   shortlist is not a submission). **← NEXT (NOT authorized):** Gate C (consent/RTR → submission →
   interview → offer → placement → invoice → collection) requires staging R2 (+ optionally Anthropic
   for AI parse). Do NOT provision R2 or begin Gate C without separate explicit approval.
6. Require human owner sign-off for roles, SLAs, consent, permissions, privacy and commercial rules
   before Gate C production activation. Do not invent missing decisions.
7. Obtain separate approvals for credential rotation, production count-only preview, production
   migrations, the exact push to `main`, every Gate A/B/C server/Vite flag change and every pilot
   data write.
8. Permit named pilot users after the Gate C smoke test; team-wide release requires 48 hours of
   stable monitored operation.

### Infrastructure truth

- Railway project `GE-Backend-Server` (id `eef927aa-8e3a-4515-85fd-781b7d1d95c1`) now has two
  environments: `production` (id `81b087de-6c7d-493c-94f0-50c8180c47da`) and `staging`
  (id `6aa742f6-38c1-4c3e-8471-6ec5fecea027`).
- Production continues to hold `web` (id `0ee1b243-97c1-4239-9016-fb7e1578b3d6`) and the original
  managed `Postgres` (id `0c31ec38-0433-46c6-9fbb-5dd2859d1a08`).
- Staging holds a managed Postgres `Postgres-Bhky`
  (id `a78f7108-45b1-46c8-bd8e-682edae2ff1f`) on its own volume
  `postgres-volume-STmx` (id `da958ec3-a5d8-46d3-bf7e-b494f5617450`), plus a `web` service
  `web-staging` (id `e7f073ec-4835-4fbb-ad1c-17f0f5bb17f6`) running this worktree at
  https://web-staging-staging-1d24.up.railway.app. `Postgres-Bhky` holds the full migration journal
  (29 entries, 81 base tables, 31 wizmatch tables) but no application/tenant data. No reference to
  the production database from either staging service.
- Production `web` is on `b05ac015eff8444edc217563fdb93ac5ef836639` and reported `SUCCESS` in
  the latest read-only inspection.
- No worker service exists in either environment.
- `railway.worker.json` is referenced by deployment documentation but is absent from this worktree;
  worker automation is a post-pilot implementation unit.
- Gate A/B/C server + Vite flags are **absent in `production`** and **ON in `staging`** (`web-staging`,
  for the pilot). `web-staging` also has `NODE_ENV=production`, `DISABLE_BACKGROUND_JOBS=true`,
  `CRM_EXTRA_ORIGIN`/`CRM_EXTRA_HOST` set to the staging domain, and sending/paid/google-fallback OFF.
  R2 and Anthropic are intentionally unset in staging.

### Approval boundaries

The same-day pilot directive does not pre-authorize a guarded operation. Stop immediately before
each migration, Railway environment/configuration change, credential operation, production-data
access/write, push/deployment, feature-flag activation, sending or paid-provider action and request
an explicit confirmation for that exact action.

Canonical context starts at `docs/wizmatch/README.md`. The reusable Claude prompt is
`docs/wizmatch/WIZMATCH_STAFFING_OS_CLAUDE_CODE_KICKOFF.md`.
