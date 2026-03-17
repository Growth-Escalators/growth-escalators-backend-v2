import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db, bookings, contacts, deals } from '../db/index';

const router = Router();

// ---------------------------------------------------------------------------
// GET /bookings?tenantId=&tier=&limit=20
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  const { tenantId, tier } = req.query as Record<string, string>;
  const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);

  if (!tenantId) {
    res.status(400).json({ error: 'tenantId is required' });
    return;
  }

  const conditions = [eq(bookings.tenantId, tenantId)];
  if (tier) conditions.push(eq(bookings.qualificationTier, tier));

  const rows = await db
    .select({
      booking: bookings,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      dealStage: deals.stage,
      dealTitle: deals.title,
    })
    .from(bookings)
    .leftJoin(contacts, eq(bookings.contactId, contacts.id))
    .leftJoin(deals, eq(bookings.dealId, deals.id))
    .where(and(...conditions))
    .orderBy(desc(bookings.scheduledAt))
    .limit(limit);

  res.json(rows);
});

// ---------------------------------------------------------------------------
// GET /bookings/:id — single booking with full contact + deal
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const rows = await db
    .select({
      booking: bookings,
      contact: contacts,
      deal: deals,
    })
    .from(bookings)
    .leftJoin(contacts, eq(bookings.contactId, contacts.id))
    .leftJoin(deals, eq(bookings.dealId, deals.id))
    .where(eq(bookings.id, req.params.id))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: 'booking not found' });
    return;
  }

  res.json(rows[0]);
});

export default router;
