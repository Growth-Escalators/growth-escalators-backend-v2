/**
 * TheirStack importer — pulls India job postings (incl. Naukri-sourced) via the
 * TheirStack API (https://api.theirstack.com/v1/jobs/search) and ingests them as
 * wizmatch_job_signals (source=theirstack). This is the $0 validation path for the
 * India/Naukri demand that Akamai blocks us from scraping directly.
 *
 * DORMANT until THEIRSTACK_API_KEY is set. Free tier = 200 API credits/month
 * (1 credit per job), so this defaults to a tight cap (WIZMATCH_THEIRSTACK_LIMIT,
 * default 25) and is scheduled weekly — ~100 credits/month, safely under the cap.
 * Bump the limit / cadence only after confirming coverage is worth paid credits.
 *
 * NOTE: verify the response field mapping against a live payload once the key is
 * available — TheirStack's schema is mapped defensively here with fallbacks.
 */
import { pool } from '../db/index';
import logger from '../utils/logger';
import { extractKeywords } from './wizmatchAtsPoller';
import { isWizmatchRelevantRole } from './wizmatchRoleRelevance';
import {
  createSourceRun,
  finishSourceRun,
  getWizmatchSourcingConfig,
  ingestWizmatchSignals,
  type SourcingSignalInput,
} from './wizmatchSourcing';

const SEARCH_URL = 'https://api.theirstack.com/v1/jobs/search';

interface TheirStackJob {
  id?: string | number;
  job_id?: string | number;
  job_title?: string;
  title?: string;
  url?: string;
  final_url?: string;
  date_posted?: string;
  location?: string;
  employment_statuses?: string[];
  description?: string;
  company_object?: { name?: string; domain?: string };
  company?: string;
  company_domain?: string;
  source_url?: string;
  discovered_at?: string;
}

export function isTheirStackEnabled(): boolean {
  return !!process.env.THEIRSTACK_API_KEY;
}

export function buildTheirStackQuery(limit: number, cursor?: string | null) {
  return {
    page: 0,
    limit,
    posted_at_max_age_days: 30,
    job_country_code_or: ['IN'],
    job_title_or: ['sap abap', 'sap fico', 'java backend', 'java developer', 'javascript developer', 'frontend developer'],
    ...(cursor ? { discovered_at_gte: cursor } : {}),
    order_by: [{ field: 'date_posted', desc: true }],
  };
}

export function previewTheirStackImport(env: NodeJS.ProcessEnv = process.env) {
  const config = getWizmatchSourcingConfig(env);
  return { enabled: config.theirstackEnabled, configured: config.theirstackConfigured, limit: config.theirstackLimit, query: buildTheirStackQuery(config.theirstackLimit) };
}

export async function importTheirStackJobs(options: { trigger?: 'manual' | 'scheduled'; requestedBy?: string | null } = {}): Promise<{
  fetched: number; inserted: number; updated: number; duplicates: number; rejected: number; errors: number;
}> {
  const apiKey = process.env.THEIRSTACK_API_KEY;
  const tenantId = process.env.WIZMATCH_TENANT_ID;
  if (!apiKey || !tenantId) {
    logger.info('[wizmatch/theirstack] THEIRSTACK_API_KEY not set — importer dormant');
    return { fetched: 0, inserted: 0, updated: 0, duplicates: 0, rejected: 0, errors: 0 };
  }
  const config = getWizmatchSourcingConfig();
  const limit = config.theirstackLimit;
  const cursorResult = await pool.query(
    `SELECT cursor_after FROM wizmatch_source_runs WHERE tenant_id=$1 AND provider='theirstack' AND status='succeeded' AND cursor_after IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
    [tenantId],
  );
  const cursor = cursorResult.rows[0]?.cursor_after || null;
  const query = buildTheirStackQuery(limit, cursor);
  const run = await createSourceRun({ tenantId, provider: 'theirstack', trigger: options.trigger, requestedBy: options.requestedBy, query, cursorBefore: cursor });

  let jobs: TheirStackJob[] = [];
  try {
    const res = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      logger.error(`[wizmatch/theirstack] search failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
      await finishSourceRun(run.id, tenantId, { status: 'failed', errorMessage: `TheirStack HTTP ${res.status}` });
      return { fetched: 0, inserted: 0, updated: 0, duplicates: 0, rejected: 0, errors: 1 };
    }
    const body = (await res.json()) as { data?: TheirStackJob[]; results?: TheirStackJob[] };
    jobs = body.data || body.results || [];
  } catch (e) {
    logger.error({ err: e }, '[wizmatch/theirstack] fetch failed');
    await finishSourceRun(run.id, tenantId, { status: 'failed', errorMessage: e instanceof Error ? e.message : 'fetch failed' });
    return { fetched: 0, inserted: 0, updated: 0, duplicates: 0, rejected: 0, errors: 1 };
  }

  const signals: SourcingSignalInput[] = jobs
    .map((j) => {
      const title = (j.job_title || j.title || '').trim();
      if (!title) return null;
      const isContract = (j.employment_statuses || []).some((s) => /contract|c2h|temporary/i.test(s));
      const description = (j.description || '').replace(/<[^>]+>/g, ' ').slice(0, 20_000);
      const keywords = extractKeywords(title, description);
      if (!isWizmatchRelevantRole({ title, description, skills: keywords })) return null;
      return {
        job_title: title,
        job_url: j.final_url || j.url,
        source: 'theirstack',
        provider_id: String(j.id || j.job_id || '').trim() || undefined,
        posted_at: j.date_posted,
        employment_type: isContract ? 'contract' : undefined,
        keywords,
        location: j.location || 'India',
        raw_text: description,
        company_name: j.company_object?.name || j.company || undefined,
        company_domain: j.company_object?.domain || j.company_domain || undefined,
      } as SourcingSignalInput;
    })
    .filter((s): s is SourcingSignalInput => !!s && !!s.job_url);

  logger.info(`[wizmatch/theirstack] fetched ${jobs.length} India jobs, ingesting ${signals.length} (limit ${limit})`);
  const result = await ingestWizmatchSignals(tenantId, signals);
  const cursorAfter = jobs.map((job) => job.discovered_at).filter(Boolean).sort().at(-1) || cursor;
  await finishSourceRun(run.id, tenantId, {
    status: result.errors ? 'partial' : 'succeeded', fetched: jobs.length, quotaConsumed: jobs.length, cursorAfter, ...result,
  });
  return { fetched: jobs.length, ...result };
}
