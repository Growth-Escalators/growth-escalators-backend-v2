import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, contacts, contactChannels } from '../db/index';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (v: string) => UUID_RE.test(v);

const router = Router();

// ---------------------------------------------------------------------------
// GET /contacts?tenantId=&status=&source=&limit=50&offset=0
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  const { tenantId, status, source, limit = '50', offset = '0' } = req.query as Record<string, string>;

  if (!tenantId || !isUUID(tenantId)) {
    res.status(400).json({ error: 'tenantId must be a valid UUID' });
    return;
  }

  const conditions = [eq(contacts.tenantId, tenantId)];
  if (status) conditions.push(eq(contacts.status, status));
  if (source) conditions.push(eq(contacts.source, source));

  const rows = await db
    .select()
    .from(contacts)
    .where(and(...conditions))
    .limit(parseInt(limit, 10))
    .offset(parseInt(offset, 10));

  res.json(rows);
});

// ---------------------------------------------------------------------------
// GET /contacts/:id — returns contact with all channels
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const contactRows = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (contactRows.length === 0) {
    res.status(404).json({ error: 'contact not found' });
    return;
  }

  const channels = await db
    .select()
    .from(contactChannels)
    .where(eq(contactChannels.contactId, id));

  res.json({ ...contactRows[0], channels });
});

// ---------------------------------------------------------------------------
// POST /contacts
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  const { tenantId, firstName, lastName, source, sourceDetail, metadata, tags } = req.body;

  if (!tenantId || !firstName) {
    res.status(400).json({ error: 'tenantId and firstName are required' });
    return;
  }

  const inserted = await db
    .insert(contacts)
    .values({ tenantId, firstName, lastName, source, sourceDetail, metadata, tags })
    .returning();

  res.status(201).json(inserted[0]);
});

// ---------------------------------------------------------------------------
// PATCH /contacts/:id
// ---------------------------------------------------------------------------
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    status,
    score,
    assignedTo,
    tags,
    metadata,
    optedInWa,
    optedInEmail,
    doNotContact,
    lastContactedAt,
  } = req.body;

  const updates: Partial<typeof contacts.$inferInsert> = { updatedAt: new Date() };
  if (status !== undefined) updates.status = status;
  if (score !== undefined) updates.score = score;
  if (assignedTo !== undefined) updates.assignedTo = assignedTo;
  if (tags !== undefined) updates.tags = tags;
  if (metadata !== undefined) updates.metadata = metadata;
  if (optedInWa !== undefined) updates.optedInWa = optedInWa;
  if (optedInEmail !== undefined) updates.optedInEmail = optedInEmail;
  if (doNotContact !== undefined) updates.doNotContact = doNotContact;
  if (lastContactedAt !== undefined) updates.lastContactedAt = new Date(lastContactedAt);

  const updated = await db
    .update(contacts)
    .set(updates)
    .where(eq(contacts.id, id))
    .returning();

  if (updated.length === 0) {
    res.status(404).json({ error: 'contact not found' });
    return;
  }

  res.json(updated[0]);
});

// ---------------------------------------------------------------------------
// POST /contacts/:id/channels
// ---------------------------------------------------------------------------
router.post('/:id/channels', async (req, res) => {
  const { id } = req.params;
  const { channelType, channelValue, isPrimary, tenantId } = req.body;

  if (!channelType || !channelValue || !tenantId) {
    res.status(400).json({ error: 'tenantId, channelType, and channelValue are required' });
    return;
  }

  try {
    const inserted = await db
      .insert(contactChannels)
      .values({ tenantId, contactId: id, channelType, channelValue, isPrimary: isPrimary ?? false })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (err: unknown) {
    // Unique constraint violation — channel already exists for this contact
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('unique') || message.includes('duplicate')) {
      res.status(409).json({ error: 'channel already exists for this contact' });
      return;
    }
    throw err;
  }
});

export default router;
