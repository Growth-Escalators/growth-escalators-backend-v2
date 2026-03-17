import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db, sequences } from '../db/index';
import {
  enrolContact,
  cancelEnrolment,
  getActiveEnrolments,
} from '../services/sequenceService';

const router = Router();

// ---------------------------------------------------------------------------
// POST /sequences — create a sequence
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  const { tenantId, name, channel, steps } = req.body;

  if (!tenantId || !name || !channel) {
    res.status(400).json({ error: 'tenantId, name, and channel are required' });
    return;
  }

  const [created] = await db
    .insert(sequences)
    .values({ tenantId, name, channel, steps: steps ?? [] })
    .returning();

  res.status(201).json(created);
});

// ---------------------------------------------------------------------------
// GET /sequences?tenantId= — list sequences for a tenant
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  const { tenantId } = req.query as Record<string, string>;

  if (!tenantId) {
    res.status(400).json({ error: 'tenantId is required' });
    return;
  }

  const rows = await db.select().from(sequences).where(eq(sequences.tenantId, tenantId));
  res.json(rows);
});

// ---------------------------------------------------------------------------
// POST /sequences/enrol — enrol a contact into a sequence
// ---------------------------------------------------------------------------
router.post('/enrol', async (req, res) => {
  const { tenantId, contactId, sequenceName, startAfterMinutes } = req.body;

  if (!tenantId || !contactId || !sequenceName) {
    res.status(400).json({ error: 'tenantId, contactId, and sequenceName are required' });
    return;
  }

  try {
    const enrolment = await enrolContact(tenantId, contactId, sequenceName, startAfterMinutes ?? 0);
    res.status(201).json(enrolment);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /sequences/enrolments/:id — cancel an enrolment
// ---------------------------------------------------------------------------
router.delete('/enrolments/:id', async (req, res) => {
  const { id } = req.params;

  const cancelled = await cancelEnrolment(id);
  if (!cancelled) {
    res.status(404).json({ error: 'enrolment not found' });
    return;
  }

  res.json(cancelled);
});

// ---------------------------------------------------------------------------
// GET /sequences/enrolments?contactId= — get active enrolments for a contact
// ---------------------------------------------------------------------------
router.get('/enrolments', async (req, res) => {
  const { contactId } = req.query as Record<string, string>;

  if (!contactId) {
    res.status(400).json({ error: 'contactId is required' });
    return;
  }

  const enrolments = await getActiveEnrolments(contactId);
  res.json(enrolments);
});

export default router;
