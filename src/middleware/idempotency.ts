import { eq } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import { db, processedEvents } from '../db/index';

// Extend Express Request to carry the resolved idempotency key downstream
declare global {
  namespace Express {
    interface Request {
      idempotencyKey?: string;
    }
  }
}

// ---------------------------------------------------------------------------
// checkIdempotency(source)
// Returns Express middleware that deduplicates requests using processed_events.
// Attaches req.idempotencyKey if the request is new.
//
// Note: webhook routes also perform their own inline deduplication for finer
// control over ID extraction. This middleware is available for any route that
// wants a single-line idempotency guard.
// ---------------------------------------------------------------------------
export function checkIdempotency(source: string) {
  return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
    // Extract a source-specific ID from the request body
    const body = req.body ?? {};
    const sourceId: string =
      body?.data?.responseId ??
      body?.eventId ??
      body?.payload?.uid ??
      String(body?.id ?? '') ??
      `${req.method}:${req.path}`;

    const key = `${source}:${sourceId}`;

    const existing = await db
      .select()
      .from(processedEvents)
      .where(eq(processedEvents.eventId, key))
      .limit(1);

    if (existing.length > 0) {
      res.status(200).json({ status: 'already_processed', key });
      return;
    }

    req.idempotencyKey = key;
    next();
  };
}
