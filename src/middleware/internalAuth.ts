/**
 * Internal token middleware for Wizmatch cron/CI endpoints.
 *
 * Extracted from the checkInternalSecret pattern in imapReplies.ts /
 * outreachLeads.ts, but uses a dedicated WIZMATCH_INTERNAL_TOKEN env var
 * (falls back to OUTREACH_INTERNAL_SECRET for convenience if not set).
 */
import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function requireInternalToken(req: Request, res: Response, next: NextFunction): void {
  const token = process.env.WIZMATCH_INTERNAL_TOKEN || process.env.OUTREACH_INTERNAL_SECRET;
  if (!token) {
    logger.error('[wizmatch] WIZMATCH_INTERNAL_TOKEN not set — blocking internal request');
    res.status(401).json({ error: 'internal token not configured' });
    return;
  }
  const provided = req.headers['x-internal-secret'] as string | undefined;
  if (provided !== token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}