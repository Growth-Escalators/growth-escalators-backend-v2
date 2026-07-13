# AI_BRIEF.md — auto-generated context snapshot

<!-- GENERATED FILE — do not edit by hand. Regenerate with: npm run ai:brief -->

_Generated: 2026-07-13T18:36:30.295Z_

This is a machine-generated snapshot of local repo state. It exists so any AI agent or fresh
chat can rebuild context from the repo alone. For durable guidance read `AGENTS.md`,
`CLAUDE.md`, and the `.ai/` files — this brief only reflects the moment it was run.

## Repository

- **Repo**: Growth-Escalators/Growth-Escalators-CRM
- **Branch**: `codex/wizmatch-phase0-trust`
- **Last commit**: a810d08 fix(migrations): make 0008/0014 idempotent for fresh-database apply (7 hours ago)
- **Uncommitted changes**: 7 file(s)

## Current task

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

> Full detail in [`.ai/CURRENT_TASK.md`](CURRENT_TASK.md) · state in [`.ai/CURRENT_STATE.md`](CURRENT_STATE.md)

## Recent commits

```
a810d08 fix(migrations): make 0008/0014 idempotent for fresh-database apply
08f1ef6 chore(ai): refresh same-day pilot brief
89bcbb2 docs(ai): prepare same-day Wizmatch pilot handoff
2085b84 chore(ai): snapshot clean release state
09722b9 chore(ai): refresh Wizmatch release brief
ff9f696 docs(ai): record Wizmatch release review
605d6cd fix(wizmatch): enforce delivery reference integrity
f293c05 chore(ai): refresh clean release snapshot
3f6679a docs(ai): record production flag verification
3ef1903 chore(ai): refresh Wizmatch release brief
```

## npm scripts

- `npm run dev` — `tsx watch src/index.ts`
- `npm run build` — `tsc`
- `npm run start` — `node dist/index.js`
- `npm run db:generate` — `drizzle-kit generate`
- `npm run db:migrate` — `drizzle-kit migrate`
- `npm run db:studio` — `drizzle-kit studio`
- `npm run db:seed` — `tsx src/db/seed.ts`
- `npm run db:import` — `tsx src/scripts/importContacts.ts`
- `npm run client:install` — `cd client && npm install`
- `npm run client:build` — `cd client && npm run build`
- `npm run client:dev` — `cd client && npm run dev`
- `npm run admin:install` — `cd admin && npm install`
- `npm run admin:build` — `cd admin && npm run build`
- `npm run admin:dev` — `cd admin && npm run dev`
- `npm run test` — `vitest --run`
- `npm run test:watch` — `vitest`
- `npm run test:coverage` — `vitest --run --coverage`
- `npm run build:all` — `npm run client:build && npm run admin:build && npm run build`
- `npm run seo:doctor` — `npx tsx scripts/seo-doctor.ts`
- `npm run db:sizes` — `npx tsx scripts/db-table-sizes.ts`
- `npm run wizmatch:env-check` — `npx tsx scripts/wizmatch-env-check.ts`
- `npm run wizmatch:staffing-backfill-preview` — `tsx scripts/wizmatch-staffing-backfill-preview.ts`
- `npm run ai:brief` — `tsx scripts/generate-ai-brief.ts`

## Context layer files (tracked)

```
.ai/AI_BRIEF.md
.ai/CURRENT_STATE.md
.ai/CURRENT_TASK.md
.ai/HANDOFF_LOG.md
.ai/REVIEW_CHECKLIST.md
.ai/TEST_PLAN.md
.ai/TOOL_ROLES.md
docs/decisions/.gitkeep
docs/decisions/ADR-001-ai-collaboration-workflow.md
docs/decisions/ADR-002-contact-intelligence-phase1-architecture.md
docs/decisions/ADR-003-contact-intelligence-review-persistence.md
docs/decisions/ADR-004-wizmatch-staffing-domain-spine.md
docs/prd/.gitkeep
docs/prd/001-contact-intelligence-phase1-plan.md
docs/prd/001-contact-intelligence.md
docs/prd/002-client-discovery-plan.md
docs/prd/003-candidate-intelligence-plan.md
docs/prd/004-phase-01-core-staffing-domain-spine.md
docs/prd/004-wizmatch-staffing-operating-system.md
docs/reviews/.gitkeep
docs/reviews/codex-ai-collaboration-review.md
docs/reviews/wizmatch-client-funnel-audit-2026-07-12.md
docs/reviews/wizmatch-cost-leakage-audit-2026-07-09.md
docs/reviews/wizmatch-staffing-release-readiness-2026-07-13.md
docs/wizmatch/README.md
docs/wizmatch/WIZMATCH_STAFFING_OS_CLAUDE_CODE_KICKOFF.md
docs/wizmatch/WIZMATCH_STAFFING_OS_DEFECT_REGISTER.md
docs/wizmatch/WIZMATCH_STAFFING_OS_OWNER_INPUTS.md
```

## Where to read next

- `AGENTS.md` — universal agent instructions + guardrails
- `CLAUDE.md` — Claude-specific responsibilities
- `.ai/TOOL_ROLES.md` — Claude / Codex / ChatGPT role split
- `.ai/REVIEW_CHECKLIST.md` — the gate every change passes
- `docs/` — architecture, database, deployment, security, conventions
