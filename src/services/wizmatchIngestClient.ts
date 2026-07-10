/**
 * Shared client for worker-side job importers (RemoteOK, TheirStack, …) to push
 * normalized job signals through the real ingest endpoint — reusing its company
 * resolve + job_url dedup logic. Same auth path as the score/enrich crons:
 * x-internal-secret against WIZMATCH_INTERNAL_TOKEN || OUTREACH_INTERNAL_SECRET.
 */
import logger from '../utils/logger';

export interface IngestSignal {
  job_title: string;
  job_url?: string;
  source: string;
  posted_at?: string;
  employment_type?: string;
  keywords?: string[];
  location?: string;
  raw_text?: string;
  company_name?: string;
  company_domain?: string;
}

export interface IngestResult {
  inserted: number;
  updated: number;
  errors: number;
}

export async function postSignals(signals: IngestSignal[], sourceLabel: string): Promise<IngestResult> {
  if (!signals.length) {
    logger.info(`[wizmatch/${sourceLabel}] no signals to ingest`);
    return { inserted: 0, updated: 0, errors: 0 };
  }
  const token = process.env.WIZMATCH_INTERNAL_TOKEN || process.env.OUTREACH_INTERNAL_SECRET;
  if (!token) {
    logger.error(`[wizmatch/${sourceLabel}] no internal token — skipping ingest`);
    return { inserted: 0, updated: 0, errors: signals.length };
  }
  const baseUrl = process.env.WIZMATCH_API_BASE_URL || 'https://api.growthescalators.com';
  const res = await fetch(`${baseUrl}/api/wizmatch/signals/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': token },
    body: JSON.stringify({ signals }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.text();
  if (!res.ok) {
    logger.error(`[wizmatch/${sourceLabel}] ingest failed ${res.status}: ${body}`);
    return { inserted: 0, updated: 0, errors: signals.length };
  }
  const parsed = JSON.parse(body) as IngestResult;
  logger.info(`[wizmatch/${sourceLabel}] ingested ${parsed.inserted} new, ${parsed.updated} updated`);
  return parsed;
}
