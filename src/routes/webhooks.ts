import { Router } from 'express';
import { eq, count, desc } from 'drizzle-orm';
import { db, processedEvents, jobs } from '../db/index';
import { insertJob } from '../services/jobQueue';
import { validateMetaWebhook } from '../middleware/validateWebhook';
import { processBooking } from '../services/bookingService';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function isAlreadyProcessed(eventId: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(processedEvents)
    .where(eq(processedEvents.eventId, eventId))
    .limit(1);
  return rows.length > 0;
}

async function markProcessed(eventId: string, source: string): Promise<void> {
  await db.insert(processedEvents).values({ eventId, source }).onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// GET /webhooks/meta-wa — Meta webhook verification challenge
// Meta sends: hub.mode=subscribe, hub.verify_token, hub.challenge
// ---------------------------------------------------------------------------
router.get('/meta-wa', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    res.status(200).send(String(challenge));
  } else {
    res.status(403).json({ error: 'verification failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /webhooks/meta-wa — Inbound WhatsApp messages
// ---------------------------------------------------------------------------
router.post('/meta-wa', validateMetaWebhook, async (req, res) => {
  // Gate on object type — Meta sends other notification types too
  if (req.body.object !== 'whatsapp_business_account') {
    res.status(200).json({ status: 'ignored' });
    return;
  }

  const value = req.body.entry?.[0]?.changes?.[0]?.value;

  // Status updates (delivered, read, failed) — no messages array
  if (value?.statuses && !value?.messages) {
    res.status(200).json({ status: 'ignored', reason: 'status_update' });
    return;
  }

  if (!value?.messages || value.messages.length === 0) {
    res.status(200).json({ status: 'ignored', reason: 'no_messages' });
    return;
  }

  // Process each message independently — idempotency per message id
  let queued = 0;
  for (const message of value.messages) {
    const eventId = `meta_wa:${message.id}`;
    if (await isAlreadyProcessed(eventId)) continue;
    await markProcessed(eventId, 'meta_wa');
    await insertJob(null, 'inbound_wa', req.body, eventId);
    queued++;
  }

  res.status(200).json({ status: 'queued', count: queued });
});

// ---------------------------------------------------------------------------
// POST /webhooks/calcom — Cal.com booking webhook
// ---------------------------------------------------------------------------
router.post('/calcom', async (req, res) => {
  const uid: string | undefined = req.body?.payload?.uid;

  if (!uid) {
    res.status(400).json({ error: 'missing booking uid' });
    return;
  }

  const eventId = `calcom:${uid}`;
  if (await isAlreadyProcessed(eventId)) {
    res.status(200).json({ status: 'already_processed' });
    return;
  }

  await markProcessed(eventId, 'calcom');

  try {
    const result = await processBooking(req.body);
    res.status(200).json({
      status: 'processed',
      tier: result.tier,
      score: result.score,
      contactId: result.contact.id,
      dealId: result.deal.id,
      isNewContact: result.contact.isNew,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[calcom webhook] processBooking failed:', message);
    await insertJob(null, 'booking_failed', { uid, error: message, payload: req.body }, `booking_failed:${uid}`);
    res.status(200).json({ status: 'error', error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /webhooks/tally — Tally form submission webhook
// ---------------------------------------------------------------------------
router.post('/tally', async (req, res) => {
  const responseId: string | undefined = req.body?.data?.responseId ?? req.body?.eventId;

  if (!responseId) {
    res.status(400).json({ error: 'missing response id' });
    return;
  }

  const eventId = `tally:${responseId}`;
  if (await isAlreadyProcessed(eventId)) {
    res.status(200).json({ status: 'already_processed' });
    return;
  }

  await markProcessed(eventId, 'tally');
  const { job } = await insertJob(null, 'form_submit', req.body, eventId);
  res.status(200).json({ status: 'queued', jobId: job.id });
});

// ---------------------------------------------------------------------------
// POST /webhooks/chatwoot — Chatwoot conversation event webhook
// ---------------------------------------------------------------------------
router.post('/chatwoot', async (req, res) => {
  const rawId = req.body?.id;

  if (rawId === undefined || rawId === null) {
    res.status(400).json({ error: 'missing event id' });
    return;
  }

  const eventId = `chatwoot:${String(rawId)}`;
  if (await isAlreadyProcessed(eventId)) {
    res.status(200).json({ status: 'already_processed' });
    return;
  }

  await markProcessed(eventId, 'chatwoot');
  const { job } = await insertJob(null, 'chatwoot_event', req.body, eventId);
  res.status(200).json({ status: 'queued', jobId: job.id });
});

// ---------------------------------------------------------------------------
// GET /webhooks/test-queue — Debug route: inspect current queue state
// ---------------------------------------------------------------------------
router.get('/test-queue', async (_req, res) => {
  const [pendingResult] = await db
    .select({ count: count() })
    .from(jobs)
    .where(eq(jobs.status, 'pending'));

  const [eventsResult] = await db.select({ count: count() }).from(processedEvents);

  const recentJobs = await db
    .select({
      id: jobs.id,
      jobType: jobs.jobType,
      status: jobs.status,
      idempotencyKey: jobs.idempotencyKey,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .orderBy(desc(jobs.createdAt))
    .limit(5);

  const recentEvents = await db
    .select()
    .from(processedEvents)
    .orderBy(desc(processedEvents.processedAt))
    .limit(5);

  res.json({
    pendingJobs: Number(pendingResult.count),
    totalProcessedEvents: Number(eventsResult.count),
    recentJobs,
    recentEvents,
  });
});

export default router;
