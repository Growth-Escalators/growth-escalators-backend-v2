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
import logger from '../utils/logger';
import { postSignals, type IngestSignal } from './wizmatchIngestClient';

const SEARCH_URL = 'https://api.theirstack.com/v1/jobs/search';

interface TheirStackJob {
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
}

export function isTheirStackEnabled(): boolean {
  return !!process.env.THEIRSTACK_API_KEY;
}

export async function importTheirStackJobs(): Promise<{ fetched: number } & Awaited<ReturnType<typeof postSignals>>> {
  const apiKey = process.env.THEIRSTACK_API_KEY;
  if (!apiKey) {
    logger.info('[wizmatch/theirstack] THEIRSTACK_API_KEY not set — importer dormant');
    return { fetched: 0, inserted: 0, updated: 0, errors: 0 };
  }
  const limit = Math.min(Number(process.env.WIZMATCH_THEIRSTACK_LIMIT) || 25, 50); // free-tier guard

  let jobs: TheirStackJob[] = [];
  try {
    const res = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        page: 0,
        limit,
        posted_at_max_age_days: 30,
        job_country_code_or: ['IN'],
        // Bias toward IT/tech contract demand; TheirStack matches these loosely.
        job_title_or: ['engineer', 'developer', 'devops', 'data', 'qa', 'architect', 'software'],
        order_by: [{ field: 'date_posted', desc: true }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      logger.error(`[wizmatch/theirstack] search failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return { fetched: 0, inserted: 0, updated: 0, errors: 0 };
    }
    const body = (await res.json()) as { data?: TheirStackJob[]; results?: TheirStackJob[] };
    jobs = body.data || body.results || [];
  } catch (e) {
    logger.error({ err: e }, '[wizmatch/theirstack] fetch failed');
    return { fetched: 0, inserted: 0, updated: 0, errors: 0 };
  }

  const signals: IngestSignal[] = jobs
    .map((j) => {
      const title = (j.job_title || j.title || '').trim();
      if (!title) return null;
      const isContract = (j.employment_statuses || []).some((s) => /contract|c2h|temporary/i.test(s));
      return {
        job_title: title,
        job_url: j.final_url || j.url,
        source: 'theirstack',
        posted_at: j.date_posted,
        employment_type: isContract ? 'contract' : undefined,
        location: j.location || 'India',
        raw_text: (j.description || '').replace(/<[^>]+>/g, ' ').slice(0, 2000),
        company_name: j.company_object?.name || j.company || undefined,
        company_domain: j.company_object?.domain || j.company_domain || undefined,
      } as IngestSignal;
    })
    .filter((s): s is IngestSignal => !!s && !!s.job_url);

  logger.info(`[wizmatch/theirstack] fetched ${jobs.length} India jobs, ingesting ${signals.length} (limit ${limit})`);
  const result = await postSignals(signals, 'theirstack');
  return { fetched: jobs.length, ...result };
}
