import { eq, and, lte, lt, asc } from 'drizzle-orm';
import { db, jobs } from '../db/index';

type Job = typeof jobs.$inferSelect;

// ---------------------------------------------------------------------------
// insertJob — enqueue a new job, skip silently if idempotencyKey already exists
// ---------------------------------------------------------------------------
export async function insertJob(
  tenantId: string | null,
  jobType: string,
  payload: object,
  idempotencyKey: string,
  processAfter?: Date,
): Promise<{ job: Job; duplicate: boolean }> {
  // Check for existing job first
  const existing = await db
    .select()
    .from(jobs)
    .where(eq(jobs.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing.length > 0) {
    return { job: existing[0], duplicate: true };
  }

  const inserted = await db
    .insert(jobs)
    .values({
      tenantId: tenantId ?? undefined,
      jobType,
      payload,
      idempotencyKey,
      processAfter: processAfter ?? new Date(),
      status: 'pending',
    })
    .onConflictDoNothing()
    .returning();

  // Edge case: race condition between select and insert — fetch the row
  if (inserted.length === 0) {
    const raceWinner = await db
      .select()
      .from(jobs)
      .where(eq(jobs.idempotencyKey, idempotencyKey))
      .limit(1);
    return { job: raceWinner[0], duplicate: true };
  }

  return { job: inserted[0], duplicate: false };
}

// ---------------------------------------------------------------------------
// claimJob — mark a job as processing
// ---------------------------------------------------------------------------
export async function claimJob(jobId: string): Promise<Job | undefined> {
  const updated = await db
    .update(jobs)
    .set({ status: 'processing', processingStartedAt: new Date() })
    .where(eq(jobs.id, jobId))
    .returning();
  return updated[0];
}

// ---------------------------------------------------------------------------
// completeJob — mark a job as completed
// ---------------------------------------------------------------------------
export async function completeJob(jobId: string): Promise<void> {
  await db
    .update(jobs)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(jobs.id, jobId));
}

// ---------------------------------------------------------------------------
// failJob — increment attempts; exponential backoff or dead_letter
// ---------------------------------------------------------------------------
export async function failJob(jobId: string, error: string): Promise<void> {
  const current = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (current.length === 0) return;

  const job = current[0];
  const newAttempts = (job.attempts ?? 0) + 1;
  const maxAttempts = job.maxAttempts ?? 3;

  if (newAttempts >= maxAttempts) {
    await db
      .update(jobs)
      .set({ status: 'dead_letter', attempts: newAttempts, lastError: error })
      .where(eq(jobs.id, jobId));
  } else {
    // Exponential backoff: newAttempts * 5 minutes
    const processAfter = new Date(Date.now() + newAttempts * 5 * 60 * 1000);
    await db
      .update(jobs)
      .set({ status: 'failed', attempts: newAttempts, lastError: error, processAfter })
      .where(eq(jobs.id, jobId));
  }
}

// ---------------------------------------------------------------------------
// getPendingJobs — fetch jobs ready to be processed
// ---------------------------------------------------------------------------
export async function getPendingJobs(jobType?: string, limit = 10): Promise<Job[]> {
  const conditions = [eq(jobs.status, 'pending'), lte(jobs.processAfter, new Date())];
  if (jobType) conditions.push(eq(jobs.jobType, jobType));

  return db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(asc(jobs.processAfter))
    .limit(limit);
}
