/**
 * Wizmatch X-Ray SERP Scraper Service
 *
 * Uses SerpAPI to run Google X-ray searches for LinkedIn profiles.
 * Extracts candidate info from search results and creates contacts + candidates.
 *
 * Free tier: 100 searches/mo — runs 3/day max.
 *
 * Called by the X-ray cron in worker.ts (daily 8 AM IST).
 */

import { pool } from '../db/index';
import { db } from '../db/index';
import { wizmatchCandidates } from '../db/schema';
import { findOrCreateContact } from './contactService';
import logger from '../utils/logger';
import { createSourceRun, finishSourceRun, getWizmatchSourcingConfig } from './wizmatchSourcing';

// ── Types ────────────────────────────────────────────────────────────────────

interface SerpResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
}

interface XrayQuery {
  q: string;
  label: string;
  skills: string[];
}

interface XrayResult {
  queries_run: number;
  candidates_found: number;
  candidates_created: number;
  skipped_exists: number;
  errors: number;
}

// ── Search templates ─────────────────────────────────────────────────────────

const XRAY_QUERIES: XrayQuery[] = [
  {
    q: 'site:linkedin.com/in "java developer" "dallas" "open to work"',
    label: 'Dallas Java',
    skills: ['java', 'spring', 'backend'],
  },
  {
    q: 'site:linkedin.com/in "python developer" "bangalore" "open to work"',
    label: 'Bangalore Python',
    skills: ['python', 'django', 'backend'],
  },
  {
    q: 'site:linkedin.com/in "react developer" "remote" "open to work"',
    label: 'Remote React',
    skills: ['react', 'javascript', 'frontend'],
  },
  {
    q: 'site:linkedin.com/in "devops engineer" "austin" "open to work"',
    label: 'Austin DevOps',
    skills: ['devops', 'aws', 'docker', 'kubernetes'],
  },
  {
    q: 'site:linkedin.com/in "data engineer" "seattle" "open to work"',
    label: 'Seattle Data Eng',
    skills: ['python', 'spark', 'airflow', 'sql'],
  },
  {
    q: 'site:linkedin.com/in ".net developer" "chennai" "open to work"',
    label: 'Chennai .NET',
    skills: ['.net', 'c#', 'sql'],
  },
  {
    q: 'site:linkedin.com/in "full stack developer" "hyderabad" "open to work"',
    label: 'Hyderabad Full Stack',
    skills: ['react', 'node', 'javascript'],
  },
  {
    q: 'site:linkedin.com/in "salesforce developer" "pune" "open to work"',
    label: 'Pune Salesforce',
    skills: ['salesforce', 'apex', 'lightning'],
  },
  {
    q: 'site:linkedin.com/in "AWS engineer" "denver" "open to work"',
    label: 'Denver AWS',
    skills: ['aws', 'devops', 'terraform'],
  },
  {
    q: 'site:linkedin.com/in "mobile developer" "san francisco" "open to work"',
    label: 'SF Mobile',
    skills: ['ios', 'android', 'swift', 'kotlin'],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_KEYWORDS = [
  'java', 'python', 'react', 'node', '.net', 'c#', 'javascript', 'typescript',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'devops', 'spring', 'django',
  'flask', 'vue', 'angular', 'sql', 'postgres', 'mongodb', 'redis', 'kafka',
  'spark', 'airflow', 'tensorflow', 'pytorch', 'machine learning', 'data engineer',
  'full stack', 'frontend', 'backend', 'mobile', 'ios', 'android', 'swift',
  'kotlin', 'go', 'rust', 'scala', 'ruby', 'php', 'laravel', 'salesforce',
];

function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_KEYWORDS.filter((skill) => lower.includes(skill));
}

function extractLocationFromQuery(query: XrayQuery): string | null {
  const match = query.q.match(/"([^"]+)"[^"]*$/);
  // Try to find the location between the last two quoted strings
  const quotes = query.q.match(/"([^"]+)"/g);
  if (quotes && quotes.length >= 2) {
    // The location is typically the second-to-last quoted term (before "open to work")
    const locationCandidate = quotes[quotes.length - 2]?.replace(/"/g, '');
    if (locationCandidate && locationCandidate !== 'open to work') return locationCandidate;
  }
  return null;
}

function parseNameFromTitle(title: string): { firstName: string; lastName: string } {
  // LinkedIn titles are usually "First Last - Title at Company" or "First Last | ..."
  const namePart = title.split(/[|\-–—]/)[0].trim();
  const parts = namePart.split(/\s+/);
  const firstName = parts[0] || 'Unknown';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
}

export function buildRequirementXraySearch(skill: string, location: string): XrayQuery {
  const normalizedSkill = skill.trim();
  const normalizedLocation = location.trim() || 'India';
  return {
    q: `site:linkedin.com/in "${normalizedSkill} developer" "${normalizedLocation}" "open to work"`,
    label: `Requirement: ${normalizedSkill} in ${normalizedLocation}`,
    skills: [normalizedSkill.toLowerCase()],
  };
}

// ── Main scraper ─────────────────────────────────────────────────────────────

export async function runXrayScrape(
  maxQueries = 3,
  adhocQuery?: { skill: string; location: string },
  context: { requirementId?: string | null; requestedBy?: string | null } = {},
): Promise<XrayResult> {
  const tenantId = process.env.WIZMATCH_TENANT_ID;
  const serpApiKey = process.env.SERPAPI_API_KEY;

  if (!tenantId) {
    logger.warn('[wizmatch-xray] WIZMATCH_TENANT_ID not set — skipping');
    return { queries_run: 0, candidates_found: 0, candidates_created: 0, skipped_exists: 0, errors: 0 };
  }

  if (!serpApiKey) {
    logger.warn('[wizmatch-xray] SERPAPI_API_KEY not set — skipping');
    return { queries_run: 0, candidates_found: 0, candidates_created: 0, skipped_exists: 0, errors: 0 };
  }

  const sourceRun = context.requirementId
    ? await createSourceRun({ tenantId, provider: 'xray', requirementId: context.requirementId, requestedBy: context.requestedBy, query: adhocQuery || {} })
    : null;

  let todayQueries: XrayQuery[];
  if (adhocQuery) {
    // On-demand path (recruiter-triggered "Source now"): run exactly ONE query for
    // the requested skill+location. Does not touch the daily rotating cron set below.
    // SerpAPI free tier is ~100 searches/month — callers must not loop this.
    todayQueries = [buildRequirementXraySearch(adhocQuery.skill, adhocQuery.location)];
  } else {
    // Rotate queries day-by-day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const startIdx = (dayOfYear * maxQueries) % XRAY_QUERIES.length;
    todayQueries = Array.from({ length: Math.min(maxQueries, XRAY_QUERIES.length) }, (_, i) =>
      XRAY_QUERIES[(startIdx + i) % XRAY_QUERIES.length],
    );
  }

  let totalFound = 0;
  let totalCreated = 0;
  let skippedExists = 0;
  let totalErrors = 0;

  for (const search of todayQueries) {
    try {
      const url = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(search.q)}&api_key=${serpApiKey}&num=10`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });

      if (!res.ok) {
        logger.warn(`[wizmatch-xray] SerpAPI returned ${res.status} for "${search.label}"`);
        totalErrors++;
        continue;
      }

      const data = await res.json() as { organic_results?: SerpResult[] };
      const results = data.organic_results || [];

      totalFound += results.length;

      for (const result of results) {
        try {
          // Must be a LinkedIn profile URL
          if (!result.link.includes('linkedin.com/in/')) continue;

          // Check if candidate already exists (by LinkedIn URL)
          const existing = await pool.query(
            `SELECT id FROM wizmatch_candidates
             WHERE tenant_id = $1 AND linkedin_url = $2`,
            [tenantId, result.link],
          ).catch(() => ({ rows: [] }));

          if (existing.rows.length > 0) {
            skippedExists++;
            continue;
          }

          // Parse name from title
          const { firstName, lastName } = parseNameFromTitle(result.title);

          // Extract skills from snippet + title
          const combinedText = `${result.title} ${result.snippet}`;
          const skills = [...new Set([...search.skills, ...extractSkillsFromText(combinedText)])];
          const location = extractLocationFromQuery(search);

          // We don't have an email from X-ray — create contact with LinkedIn URL only
          const { contact } = await findOrCreateContact(tenantId, {
            firstName,
            lastName: lastName || undefined,
            source: 'wizmatch_xray',
            sourceDetail: `LinkedIn X-ray: ${result.link}`,
            channels: [], // No email from X-ray — will be enriched later
          });

          await db.insert(wizmatchCandidates).values({
            tenantId,
            contactId: contact.id,
            skills,
            location,
            visaStatus: 'unknown',
            source: 'xray',
            linkedinUrl: result.link,
            indiaSpecific: {
              sourcingEvidence: {
                state: 'candidate_lead',
                requirementId: context.requirementId || null,
                query: search.q,
                headline: result.title,
                snippet: result.snippet,
                discoveredAt: new Date().toISOString(),
                reviewed: false,
              },
            },
          }).onConflictDoNothing();

          totalCreated++;
        } catch (e) {
          totalErrors++;
          logger.error(`[wizmatch-xray] Error processing result:`, e instanceof Error ? e.message : String(e));
        }
      }
    } catch (e) {
      totalErrors++;
      logger.error(`[wizmatch-xray] Query "${search.label}" failed:`, e instanceof Error ? e.message : String(e));
    }

    // Delay between searches (SerpAPI rate limit)
    await new Promise((r) => setTimeout(r, 3000));
  }

  if (sourceRun) {
    await finishSourceRun(sourceRun.id, tenantId, {
      status: totalErrors ? 'partial' : 'succeeded', fetched: totalFound, inserted: totalCreated,
      updated: 0, duplicates: skippedExists, rejected: 0, errors: totalErrors, quotaConsumed: todayQueries.length,
    });
  }

  logger.info(
    `[wizmatch-xray] Scraped ${todayQueries.length} queries: ${totalFound} results found, ${totalCreated} candidates created, ${skippedExists} already existed, ${totalErrors} errors`,
  );

  return {
    queries_run: todayQueries.length,
    candidates_found: totalFound,
    candidates_created: totalCreated,
    skipped_exists: skippedExists,
    errors: totalErrors,
  };
}

export async function runRequirementXray(tenantId: string, requirementId: string, requestedBy: string) {
  if (tenantId !== process.env.WIZMATCH_TENANT_ID) throw new Error('X-Ray tenant is not configured');
  const config = getWizmatchSourcingConfig();
  if (!config.xrayEnabled) throw new Error('Requirement-first X-Ray is disabled or not configured');
  const requirement = await pool.query(
    `SELECT r.id,r.location,r.work_mode,r.min_experience,r.stage,
            ARRAY_REMOVE(ARRAY_AGG(CASE WHEN rs.importance='mandatory' THEN s.canonical_label END),NULL) AS mandatory_skills
     FROM wizmatch_requirements r
     LEFT JOIN wizmatch_requirement_skills rs ON rs.requirement_id=r.id AND rs.tenant_id=r.tenant_id
     LEFT JOIN wizmatch_skills s ON s.id=rs.skill_id AND s.tenant_id=rs.tenant_id
     WHERE r.id=$1 AND r.tenant_id=$2 GROUP BY r.id`,
    [requirementId, tenantId],
  );
  if (!requirement.rows[0]) throw new Error('Requirement not found');
  if (!['accepted', 'sourcing', 'covered'].includes(requirement.rows[0].stage)) {
    throw new Error('Requirement must be accepted before candidate sourcing');
  }
  const skill = requirement.rows[0].mandatory_skills?.[0];
  if (!skill) throw new Error('Requirement needs at least one canonical mandatory skill');
  const cooldown = await pool.query(
    `SELECT 1 FROM wizmatch_source_runs WHERE tenant_id=$1 AND provider='xray' AND requirement_id=$2
     AND status IN ('succeeded','partial') AND created_at > NOW()-INTERVAL '7 days' LIMIT 1`,
    [tenantId, requirementId],
  );
  if (cooldown.rows.length) throw new Error('This requirement already used X-Ray in the last seven days');
  const usage = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE created_at::date=CURRENT_DATE)::int AS daily,
            COUNT(*) FILTER (WHERE date_trunc('month',created_at)=date_trunc('month',NOW()))::int AS monthly
     FROM wizmatch_source_runs WHERE tenant_id=$1 AND provider='xray' AND status IN ('succeeded','partial','running')`,
    [tenantId],
  );
  if ((usage.rows[0]?.daily || 0) >= config.xrayDailyCap) throw new Error('Daily X-Ray cap reached');
  if ((usage.rows[0]?.monthly || 0) >= config.xrayMonthlyCap) throw new Error('Monthly X-Ray cap reached');
  return runXrayScrape(1, { skill, location: requirement.rows[0].location || 'India' }, { requirementId, requestedBy });
}
