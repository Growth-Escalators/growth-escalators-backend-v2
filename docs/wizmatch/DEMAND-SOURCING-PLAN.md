# Wizmatch Demand-Signal Sourcing — the asset (minimum-cost)

**Updated:** 2026-07-10. The pipeline is: **source jobs → ingest → score (incl. C2C) →
enrich (find the decision-maker's email, free-first) → match candidates → outreach**.

## Sources we run (ranked by cost)

| Source | Type | Cost | Status |
|---|---|---|---|
| **Dice** (`wizmatch-dice.yml`) | CI (Playwright) | $0 | ✅ Live — extraction fixed, ~80 jobs/run, ingests |
| **ATS public APIs** — Greenhouse/Lever/Ashby (`wizmatchAtsPoller.ts`) | Worker cron, daily 6 AM IST | $0 | ✅ Live — **26 boards seeded** (24 Greenhouse + 2 Lever), thousands of open roles |
| **RemoteOK** (`wizmatchRemoteOkImporter.ts`) | Worker cron, daily 7 AM IST | $0 | ✅ Live — validated (47 signals ingested) |
| **LCA H-1B filers** (`wizmatchLcaImporter.ts`) | Worker cron, weekly | $0 | ✅ Exists — C2C-target seed + H-1B scoring signal |
| **X-Ray / GitHub miner** | Worker crons | $0 | ✅ Exists — candidate (supply) sourcing |
| **TheirStack** (`wizmatchTheirStackImporter.ts`) — India incl. Naukri | Worker cron, weekly Mon | $0 free tier (200 credits/mo) | ⏸️ **Built, dormant** — set `THEIRSTACK_API_KEY` to enable |
| **Naukri direct scrape** | — | — | ❌ **Abandoned** — Akamai IP-blocks CI. Use TheirStack (or paid Apify actor) instead |

## What was fixed to make this flow (2026-07-10)

- **Ingest/pipeline auth (keystone):** the worker's score/enrich/match crons and CI scrapers
  POST to `/api/wizmatch/{signals/ingest, signals/:id/(score|enrich|match), candidates/ingest,
  classify-reply}` with only `x-internal-secret`, but the whole router sat behind the browser JWT
  wall → every internal call 401'd, stalling the entire pipeline. Those six POST routes now bypass
  the JWT wall (each still enforces the shared secret via `requireInternalToken`, hardened to
  `crypto.timingSafeEqual`). The CI token (`INTERNAL_API_TOKEN`) was aligned to the server's
  `OUTREACH_INTERNAL_SECRET`.
- **Dice extraction:** title now derived from anchor text → aria-label → nearest heading.
- **C2C-friendliness scorer:** `wizmatchScoring.ts` now scans the **job title + description**
  (not just keywords) and flags `c2cFriendly` when it sees corp-to-corp / 1099 / visa-open
  language — so offshore-friendly demand is detectable and prioritisable. Does not change the
  score>=7 enrich gate.

## Contact discovery (already built — free-first)

`wizmatchContactDiscoveryProviders.ts` + `emailExtractorService.ts`: website pattern extraction →
MX classify (Google/M365 caveat) → catch-all detect → **pattern-guess + Reacher verify (free)** →
paid finders (Hunter/Apollo/Snov) **gated off by default**. The hourly enrich cron runs this on
every `score>=7` signal — demand auto-connects to a reachable decision-maker at $0.

## Cost posture

- **Everything above (except TheirStack paid tier) is $0.** Paid providers stay gated.
- **First spend only when** free credits are exhausted **and** replies prove conversion:
  TheirStack $59/mo, Apify `memo23/naukri-scraper` (~$3–10/mo) for Naukri, paid Hunter/Apollo seat.

## To extend

- **Add ATS boards:** append to `scripts/onboarding/wizmatch-seed-ats-boards.ts` and re-run
  (validate the slug returns jobs first). Seed from LCA filers + real client-type companies.
- **Enable India/Naukri demand:** set `THEIRSTACK_API_KEY` (free signup) → the weekly importer
  wakes up. Verify the response field mapping against a live payload on first run.
- **Tune C2C detection:** `C2C_MARKERS` / `US_CONTRACT_KEYWORDS` in `wizmatchScoring.ts`.
