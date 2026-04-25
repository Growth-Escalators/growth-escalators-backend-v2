import { Router, type Request, type Response } from 'express';
import { db } from '../db/index';
import { sql } from 'drizzle-orm';
import logger from '../utils/logger';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/team — minimal list of teammates in the caller's tenant.
// Used by the Tasks page (and anywhere else that needs an assignee dropdown).
// Authenticated but NOT owner-restricted — assignment dropdowns must be visible
// to every staff member, unlike /api/permissions/users which exposes role mgmt.
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  try {
    const result = await db.execute(sql`
      SELECT id, name, email, role
      FROM users
      WHERE tenant_id = ${tenantId}
        AND (is_active IS NULL OR is_active = true)
      ORDER BY name
    `);
    res.json({ team: result.rows });
  } catch (e: unknown) {
    logger.error('[team] GET / error:', e);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
