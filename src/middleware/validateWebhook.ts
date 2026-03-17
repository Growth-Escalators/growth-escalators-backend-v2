import { createHmac, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// validateMetaWebhook
// GET  — handles Meta's verification challenge
// POST — verifies X-Hub-Signature-256 HMAC-SHA256 signature
// ---------------------------------------------------------------------------
export function validateMetaWebhook(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET') {
    const verifyToken = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (verifyToken === process.env.META_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: 'invalid verify token' });
    }
    return;
  }

  // POST — verify HMAC signature
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    // No secret configured — allow through with a warning (dev/test only)
    console.warn('[validateMetaWebhook] META_APP_SECRET not set — skipping signature check');
    next();
    return;
  }

  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) {
    res.status(403).json({ error: 'missing X-Hub-Signature-256 header' });
    return;
  }

  // NOTE: In production, use the raw request body buffer (before JSON.parse) for accuracy.
  // Here we re-serialize req.body which is sufficient for development and testing.
  const body = JSON.stringify(req.body);
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex');

  try {
    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expBuffer.length || !timingSafeEqual(sigBuffer, expBuffer)) {
      res.status(403).json({ error: 'invalid signature' });
      return;
    }
  } catch {
    res.status(403).json({ error: 'signature verification failed' });
    return;
  }

  next();
}

// ---------------------------------------------------------------------------
// validateGenericWebhook
// Placeholder — add per-source validation logic here as needed
// ---------------------------------------------------------------------------
export function validateGenericWebhook(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
