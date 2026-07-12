# Wizmatch — client-acquisition funnel test plan

**Purpose:** a pre-launch functional + UX audit of the Wizmatch admin panel, scoped to the
**client-acquisition (demand) side only** — the flow that finds IT/tech staffing clients (companies
that are hiring) and gets a decision-maker into conversation. The candidate/talent side (the
"students part") is explicitly **out of scope for this pass** — it comes after the client-side flow
is proven solid.

This plan is meant to be followed by an AI agent (or a person driving one) with **no prior context
on this conversation** — it should read as a complete, standalone brief.

---

## 0. Before you start

1. Read `AGENTS.md` and `CLAUDE.md` at the repo root — universal working agreement + guardrails.
2. Read `docs/wizmatch/DATAFLOW.md` — the authoritative map of how data actually moves through the
   system (corrected 2026-07-12). It tells you what each page/button is *supposed* to do, so you can
   tell "looks fine but isn't real" apart from "genuinely wired to real data."
3. Read `docs/ARCHITECTURE.md` and `CRM_SYSTEM_DOCS.md` for the broader system shape.
4. Decide your test surface:
   - **Live site** (`crm.growthescalators.com`, tenant = Wizmatch) if you have login credentials —
     this is the real thing operators will use, so prefer this if you can get credentials safely
     from the person who gave you this brief. **Never** ask for or hardcode a password in anything
     you write down or commit.
   - **Local dev** (`npm run dev` for the API, `npm run admin:dev` for the panel) if live credentials
     aren't available — note in your report which one you used, since local data may be thinner.

## 1. Hard safety rules — read this twice

This is a **read-only audit**, not an operations day. Wizmatch touches real money and real inboxes:

- **Never** click a final "Send" / "Confirm send" on any outreach action. If a button is a preview
  (e.g. "Preview cost," "Run Safe Action" on a *non-destructive* card), that's fine to click — read
  the button's own label and any confirmation dialog before clicking anything that sounds
  irreversible.
- **Never** trigger paid contact discovery beyond what the UI already gates behind an explicit
  confirm step — if a modal says it will spend money, stop and note it in your report instead of
  confirming.
- **Never** edit `src/db/schema.ts`, `src/db/migrations/`, `src/middleware/auth.ts`,
  `src/middleware/rbac.ts`, `src/routes/cashfree.ts`, or `src/services/sodEodService.ts` — this is a
  testing pass, not a fix pass. If you find a bug, report it — don't patch it yourself unless
  explicitly asked in a follow-up.
- **Never** run destructive DB operations, `git push`, or delete anything.
- If you're testing against the live site with a real admin login, treat every write action (adding a
  note, tagging a contact, editing a requirement) as **real** — it will show up for the actual team.
  Prefer using data you create yourself (e.g. a requirement you add and label clearly as a test) over
  editing existing real records, and mention anything you created so it can be cleaned up.

## 2. Scope — what's in, what's out

**In scope (walk this in order — it's the canonical funnel as of 2026-07-11):**

| # | Page | Route |
|---|---|---|
| 1 | Dashboard | `/wizmatch/dashboard` |
| 2 | Review Workbench | `/wizmatch/review-workbench` |
| 3 | Client Discovery | `/wizmatch/client-discovery` |
| 4 | Signals | `/wizmatch/signals` |
| 5 | Contact Intelligence | `/wizmatch/contact-intelligence` |
| 6 | Requirement Priority | `/wizmatch/requirement-priority-new` |
| 7 | Requirements | `/wizmatch/requirements` |
| 8 | Placements | `/wizmatch/placements` |
| 9 | Analytics | `/wizmatch/analytics` |
| 10 | AI Intelligence | `/wizmatch/intelligence` |
| 11 | System (light check only) | `/wizmatch/system` (5 tabs) |
| 12 | Contacts (only the Client Lead–tagged ones) | `/wizmatch/contacts` |

Lightly touch if time permits, but don't deep-dive: Pipeline, Tasks, Inbox (shared CRM utility used
by both sides).

**Explicitly OUT of scope this pass** (the "students part," coming later): Candidate Intelligence,
Candidates, Primes, and any candidate/matching/RTR/placement-from-the-talent-side workflow. If a page
mixes both (e.g. Placements shows deals from either side), only evaluate it through the client lens.

## 3. What "good" looks like (the standard to test against)

A prior workstream (shipped 2026-07-11/12) specifically targeted three things — verify they actually
hold up in practice, not just in the code:

1. **One coherent order.** The funnel above should read as a single obvious path — Dashboard tells
   you what needs attention *right now* and links straight into the Review Workbench; each stage's
   raw list (Signals under Client Discovery, Requirements under Requirement Priority) sits right next
   to its "intelligence" page.
2. **Every action shows its outcome + next step.** Click every button on every page. For each one:
   does something visibly change (a badge, a status, a banner)? Is it obvious what to do next, or do
   you have to guess? A button that just says "Working..." and then goes quiet, with no way to tell
   if it worked, is a defect — write it down.
3. **Daily pages show only daily-relevant data.** Diagnostics (readiness, guardrails, domain health,
   compliance) should live only in the System page, not scattered across the funnel pages.

## 4. Per-page checklist

For **every** in-scope page, answer:

- **Does the data look real and meaningful**, or is it placeholder/zero/fake-looking? (Cross-check
  against `DATAFLOW.md` — e.g. Client Discovery should be fed by the ATS Poller/RemoteOK/TheirStack
  crons + manual seed, not by nothing.)
- **Click every button/action.** What happens? Is there a clear success/failure signal? Is there a
  "go here next" link where one would help?
- **Are labels and numbers self-explanatory** to someone who has never seen this system, or would
  they need an explanation? (E.g. does "Score: 0/100" mean anything, or is it a leftover from a
  different feature?)
- **Any dead ends** — buttons that do nothing, links that 404, tabs that never load, forms that don't
  save?
- **Any confusing duplication** — two things that look like they do the same thing but don't, or
  vice versa?
- **Error/empty states** — what does the page look like with zero data? Is it a blank screen, or does
  it explain what to do?

Specific things worth checking given recent history:

- **Contact Intelligence:** verify the "approve contact" / "reject" / "link to CRM" actions actually
  do what they say, and that a linked contact shows up correctly in `/wizmatch/contacts` afterward
  (with a Client Lead tag, business fields visible — not the "Unknown/0-100" placeholders that were
  just fixed for candidates; confirm client-side contacts still show their real business info).
- **Requirement Priority → Requirements:** try the JD paste/upload → Claude-parse → confirm flow end
  to end. Does the parsed data look right? Does confirming actually create a usable Requirement?
- **Review Workbench:** each action card should explain what the action *is*, why it's suggested, and
  show a real result inline after running it (not just a spinner).
- **AI Intelligence:** click "Generate" — does the analysis reference specific requirements/signals/
  companies by name, or is it generic boilerplate? (It was recently upgraded to use row-level data —
  verify that's actually visible in the output.)
- **System page:** confirm all 5 tabs load without errors and that the Env Health tab never displays
  an actual secret value, only presence/absence.

## 5. Deliverable

Write your findings to a new file: `docs/reviews/wizmatch-client-funnel-audit-<YYYY-MM-DD>.md`
(follow the existing convention in `docs/reviews/`). Structure:

1. **One-paragraph verdict** — is this ready to run real client-acquisition work on today? If not,
   what's the single biggest blocker?
2. **Functionality matrix** — a table: Page | Feature/Button | Works as expected? | Notes.
3. **Defects, ranked by severity** — anything broken, confusing, or a dead end. For each: what you
   did, what you expected, what actually happened.
4. **UX observations** — things that technically work but would confuse a first-time operator.
5. **What impressed you** — don't only report problems; note what's genuinely solid, so the team
   knows what NOT to touch.
6. **Anything you created for testing** — so it can be cleaned up (test requirements, test contacts,
   etc.) if you tested against the live site.

Keep it concrete and specific (page names, button labels, exact repro steps) — "the UX feels
confusing" is much less useful than "on Requirement Priority, clicking 'Prepare review plan' shows no
result and the button stays clickable, so I clicked it 3 times unsure if it worked."
