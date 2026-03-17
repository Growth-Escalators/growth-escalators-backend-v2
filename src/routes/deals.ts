import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, deals } from '../db/index';

const router = Router();

// ---------------------------------------------------------------------------
// GET /deals?tenantId=&stage=&contactId=
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  const { tenantId, stage, contactId } = req.query as Record<string, string>;

  if (!tenantId) {
    res.status(400).json({ error: 'tenantId is required' });
    return;
  }

  const conditions = [eq(deals.tenantId, tenantId)];
  if (stage) conditions.push(eq(deals.stage, stage));
  if (contactId) conditions.push(eq(deals.contactId, contactId));

  const rows = await db
    .select()
    .from(deals)
    .where(and(...conditions));

  res.json(rows);
});

// ---------------------------------------------------------------------------
// POST /deals
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  const { tenantId, contactId, title, stage, value, serviceType, metadata } = req.body;

  if (!tenantId || !contactId || !title) {
    res.status(400).json({ error: 'tenantId, contactId, and title are required' });
    return;
  }

  const inserted = await db
    .insert(deals)
    .values({ tenantId, contactId, title, stage, value, serviceType, metadata })
    .returning();

  res.status(201).json(inserted[0]);
});

// ---------------------------------------------------------------------------
// PATCH /deals/:id
// Automatically sets closedAt when stage transitions to 'won' or 'lost'
// ---------------------------------------------------------------------------
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { stage, value, lostReason, closedAt, metadata } = req.body;

  const updates: Partial<typeof deals.$inferInsert> = { updatedAt: new Date() };
  if (stage !== undefined) updates.stage = stage;
  if (value !== undefined) updates.value = value;
  if (lostReason !== undefined) updates.lostReason = lostReason;
  if (metadata !== undefined) updates.metadata = metadata;

  // Auto-set closedAt when moving to a terminal stage
  if ((stage === 'won' || stage === 'lost') && !closedAt) {
    updates.closedAt = new Date();
  } else if (closedAt !== undefined) {
    updates.closedAt = new Date(closedAt);
  }

  const updated = await db
    .update(deals)
    .set(updates)
    .where(eq(deals.id, id))
    .returning();

  if (updated.length === 0) {
    res.status(404).json({ error: 'deal not found' });
    return;
  }

  res.json(updated[0]);
});

export default router;
