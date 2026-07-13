# Migration-guardrail review — commit `a810d08`

- **Date:** 2026-07-13
- **Reviewer:** Claude (senior architect/engineer)
- **Subject:** `a810d08 fix(migrations): make 0008/0014 idempotent for fresh-database apply`
- **Status:** OPEN — do **not** push without a migration-owner exception or a safer replacement (see Decision needed).

## What the commit does

Edits two **already-applied** historical migrations so the full journal (`0000`–`0028`) can be
replayed onto an empty database:

- `src/db/migrations/0008_great_romulus.sql` — guards 8 statements that `0007` (an idempotent
  retrofit superset) already performs: `CREATE TABLE IF NOT EXISTS` (×2), `ADD COLUMN IF NOT EXISTS`
  (×3), and `DO $$ … pg_constraint …$$` guards on the 3 social FK constraints.
- `src/db/migrations/0014_brevo_email_templates_seed.sql` — replaces `ON CONFLICT ON CONSTRAINT
  email_templates_tenant_name_idx` (a unique **index**, not a constraint) with `ON CONFLICT
  (tenant_id, name)` (×5).

Diff: 2 files, +25/−13. The commit is **local-only** on `codex/wizmatch-phase0-trust`; it has not
been pushed to any remote and `main` has not been deployed.

## The guardrail it touches

`AGENTS.md` (and `CLAUDE.md`) list, under "do not touch without explicit human confirmation":

> `src/db/migrations/` — Already-applied SQL — editing breaks prod Postgres state

By the **letter** of this guardrail, `a810d08` is a violation: `0008` and `0014` are already applied
in production, and the commit hand-edits them.

## Why it is very likely prod-safe (but still needs sign-off)

Production is migrated by the drizzle-orm node-postgres migrator (`src/scripts/migrate.ts` →
`node dist/scripts/migrate.js` at deploy):

1. It applies only journal entries whose `when` timestamp is **greater than the single most-recent
   applied migration's `created_at`**. `0008`/`0014` are far older than the latest applied (`0028`),
   so they **will not re-run** on a production deploy.
2. It does **not** re-hash or integrity-check already-applied migrations, so the changed file
   content does not trigger re-application or an error.
3. Even if they did re-run, the edits are **idempotent** (`IF NOT EXISTS` / `DO … pg_constraint` /
   `ON CONFLICT (cols)`) — no-ops against the existing production schema.
4. No **resulting schema shape** changes; no drizzle `meta/*_snapshot.json` change; `db:generate`
   is unaffected.
5. Verified empirically: the full journal applied cleanly to a **fresh** Railway staging Postgres
   (29/29 migrations, 81 tables) using the edited files.

## Residual risk (why the guardrail still deserves respect here)

- It rewrites the committed content of already-applied migrations — exactly the class of change the
  guardrail exists to prevent; it sets a precedent.
- It relies on drizzle's current **timestamp-only** comparison. A future drizzle-kit/migrator that
  adds per-migration hash-integrity checks could flag the drift.
- Any environment or tool that records migration file hashes would see a mismatch.

## Decision needed (migration owner)

**Option 1 — Documented migration-owner exception (keep `a810d08`).**
The migration owner (Jatin) explicitly approves this one-time edit, on the basis of the prod-safety
analysis above, because it is the only way to make the historical chain replayable onto a fresh
database (needed for staging and any fresh clone) and it is verified. Record the exception in
`docs/decisions/` (ADR). Then it may be committed as-is; pushing `main` remains a separate approval.

**Option 2 — Safer replacement (revert `a810d08`; freeze historical migrations).**
Revert the commit so `0008`/`0014` stay byte-frozen. Provision fresh databases from a **baseline
schema dump + journal stamp** (a documented procedure) instead of replaying the full historical
chain. The staging DB already built remains valid (it used the fix once). Downside: the migration
chain is no longer a supported fresh-install path; a maintained baseline + runbook is required.

## Recommendation

This is genuinely the migration owner's call. Given the prod-safety analysis and that the chain is
otherwise **not** replayable onto a fresh DB, **Option 1 (documented exception)** is the pragmatic
choice; **Option 2** is the guardrail-purist choice. Either way:

- **Do not push `a810d08`, and do not push `main`, until the owner explicitly chooses.**
- If undecided, the commit stays local/unpushed and staging remains fully functional.
