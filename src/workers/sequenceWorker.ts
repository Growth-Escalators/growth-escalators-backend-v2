import { eq, and, lte } from 'drizzle-orm';
import { db, sequenceEnrolments, sequences } from '../db/index';
import { insertJob } from '../services/jobQueue';

interface SequenceStep {
  stepIndex: number;
  delayDays: number;
  templateName: string;
  channel: string;
  condition: string | null;
}

const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

async function processSequenceSteps(): Promise<void> {
  try {
  const now = new Date();

  // Fetch active enrolments whose next step is due
  const dueEnrolments = await db
    .select()
    .from(sequenceEnrolments)
    .where(
      and(
        eq(sequenceEnrolments.status, 'active'),
        lte(sequenceEnrolments.nextStepAt, now),
      ),
    )
    .orderBy(sequenceEnrolments.nextStepAt)
    .limit(50);

  let processed = 0;

  for (const enrolment of dueEnrolments) {
    // Fetch sequence to get its steps array
    const seqRows = await db
      .select()
      .from(sequences)
      .where(eq(sequences.id, enrolment.sequenceId))
      .limit(1);

    if (seqRows.length === 0) continue;

    const steps = (seqRows[0].steps ?? []) as SequenceStep[];
    const currentStepIndex = enrolment.currentStep ?? 0;
    const step = steps[currentStepIndex];

    // No step at this index — sequence is complete
    if (!step) {
      await db
        .update(sequenceEnrolments)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(sequenceEnrolments.id, enrolment.id));
      console.log(`[sequenceWorker] Completed enrolment ${enrolment.id} (no more steps)`);
      processed++;
      continue;
    }

    // Insert a sequence_step job (idempotent)
    const idempotencyKey = `seq_step:${enrolment.id}:${currentStepIndex}`;
    await insertJob(
      enrolment.tenantId,
      'sequence_step',
      {
        enrolmentId: enrolment.id,
        contactId: enrolment.contactId,
        tenantId: enrolment.tenantId,
        sequenceId: enrolment.sequenceId,
        stepIndex: currentStepIndex,
        stepDefinition: step,
        scheduledFor: enrolment.nextStepAt,
      },
      idempotencyKey,
    );

    // Advance the enrolment: next step fires after the NEXT step's delayDays
    const nextStepDefinition = steps[currentStepIndex + 1];
    const delayMs = nextStepDefinition
      ? nextStepDefinition.delayDays * 24 * 60 * 60 * 1000
      : 0;
    const nextStepAt = new Date(Date.now() + delayMs);

    await db
      .update(sequenceEnrolments)
      .set({
        currentStep: currentStepIndex + 1,
        nextStepAt,
      })
      .where(eq(sequenceEnrolments.id, enrolment.id));

    console.log(
      `[sequenceWorker] Queued step ${currentStepIndex} for enrolment ${enrolment.id}`,
    );
    processed++;
  }

  console.log(`[sequenceWorker] Processed ${processed} enrolments`);
  } catch (error) {
    console.error('[sequenceWorker] Error during processing:', error);
  }
}

export function startSequenceWorker(): void {
  console.log('[sequenceWorker] Started — polling every 30 seconds for due sequence steps.');
  // Run immediately on startup, then on interval
  processSequenceSteps().catch((err) =>
    console.error('[sequenceWorker] Error on initial run:', err),
  );
  setInterval(() => {
    processSequenceSteps().catch((err) =>
      console.error('[sequenceWorker] Error during poll:', err),
    );
  }, POLL_INTERVAL_MS);
}
