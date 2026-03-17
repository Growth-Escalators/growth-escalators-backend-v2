import { eq, and, lt } from 'drizzle-orm';
import { db, jobs } from '../db/index';
import { failJob } from '../services/jobQueue';

const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const POLL_INTERVAL_MS = 10 * 60 * 1000;   // run every 10 minutes

async function recoverStuckJobs(): Promise<void> {
  const threshold = new Date(Date.now() - STUCK_THRESHOLD_MS);

  const stuckJobs = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.status, 'processing'),
        lt(jobs.processingStartedAt, threshold),
      ),
    );

  if (stuckJobs.length === 0) return;

  console.log(`[stuckJobWorker] Found ${stuckJobs.length} stuck job(s) — recovering...`);

  for (const job of stuckJobs) {
    await failJob(job.id, 'job timed out - was stuck in processing');
  }

  console.log(`[stuckJobWorker] Recovered ${stuckJobs.length} job(s).`);
}

export function startStuckJobWorker(): void {
  console.log('[stuckJobWorker] Started — polling every 10 minutes for stuck jobs.');
  setInterval(() => {
    recoverStuckJobs().catch((err) =>
      console.error('[stuckJobWorker] Error during recovery:', err),
    );
  }, POLL_INTERVAL_MS);
}
