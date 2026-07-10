/**
 * RemoteOK importer — pulls the free public JSON feed (https://remoteok.com/api)
 * and ingests remote tech/contract roles as wizmatch_job_signals (source=remoteok).
 * $0, no auth, no anti-bot. RemoteOK ToS requires attribution + a direct link back —
 * we store the direct job_url and surface it in the admin, satisfying that.
 *
 * Runs as a worker cron; pushes through the shared ingest endpoint (dedup + company
 * resolve). Filters to engineering/data/devops roles (Wizmatch is IT/tech staffing).
 */
import logger from '../utils/logger';
import { postSignals, type IngestSignal } from './wizmatchIngestClient';

const FEED_URL = 'https://remoteok.com/api';

// Wizmatch is IT/tech staffing — keep dev/data/devops/QA/cloud roles, drop the
// design/marketing/sales/support noise RemoteOK also carries.
const TECH_RE = /\b(engineer|developer|dev\b|programmer|backend|back-end|frontend|front-end|full[\s-]?stack|devops|sre|data|machine learning|ml\b|ai\b|cloud|platform|software|architect|qa|sdet|security|mobile|ios|android|java|python|golang|node|react|angular|kubernetes|infrastructure)\b/i;

interface RemoteOkJob {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  tags?: string[];
  location?: string;
  url?: string;
  apply_url?: string;
  date?: string;
  description?: string;
}

export async function importRemoteOkJobs(): Promise<{ fetched: number } & Awaited<ReturnType<typeof postSignals>>> {
  let raw: unknown;
  try {
    const res = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'WizmatchBot/1.0 (+https://crm.growthescalators.com; staffing job aggregation)' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`RemoteOK feed ${res.status}`);
    raw = await res.json();
  } catch (e) {
    logger.error({ err: e }, '[wizmatch/remoteok] fetch failed');
    return { fetched: 0, inserted: 0, updated: 0, errors: 0 };
  }

  // First array element is a legal/attribution notice — skip anything without a position.
  const jobs = (Array.isArray(raw) ? (raw as RemoteOkJob[]) : []).filter((j) => j && j.position && (j.id || j.slug));
  const signals: IngestSignal[] = jobs
    .filter((j) => TECH_RE.test(`${j.position} ${(j.tags || []).join(' ')}`))
    .slice(0, 100)
    .map((j) => {
      const tagText = (j.tags || []).join(' ').toLowerCase();
      const isContract = /contract|c2c|freelance|1099/.test(tagText) || /contract/i.test(j.position || '');
      return {
        job_title: j.position!.trim(),
        job_url: j.url || (j.slug ? `https://remoteok.com/remote-jobs/${j.slug}` : undefined),
        source: 'remoteok',
        posted_at: j.date,
        employment_type: isContract ? 'contract' : undefined,
        location: j.location || 'Remote',
        keywords: (j.tags || []).slice(0, 8),
        company_name: j.company || undefined,
        raw_text: (j.description || '').replace(/<[^>]+>/g, ' ').slice(0, 2000),
      };
    })
    .filter((s) => !!s.job_url);

  logger.info(`[wizmatch/remoteok] ${jobs.length} tech jobs in feed, ingesting ${signals.length}`);
  const result = await postSignals(signals, 'remoteok');
  return { fetched: jobs.length, ...result };
}
