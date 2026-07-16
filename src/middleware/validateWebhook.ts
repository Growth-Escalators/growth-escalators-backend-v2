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

  // POST — verify HMAC signature. Fails CLOSED when the secret is unset —
  // silently accepting unverified inbound WhatsApp messages let anyone who
  // discovers the endpoint inject fabricated messages that create contacts
  // and emit socket events.
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error('[validateMetaWebhook] META_APP_SECRET not set — rejecting webhook');
    res.status(503).json({ error: 'webhook verification not configured' });
    return;
  }

  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) {
    res.status(403).json({ error: 'missing X-Hub-Signature-256 header' });
    return;
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    res.status(403).json({ error: 'raw body unavailable for signature verification' });
    return;
  }

  // Signed over the exact bytes Meta sent, not a re-serialization of the
  // parsed body — JSON.stringify(req.body) rarely reproduces the original
  // bytes (key order, whitespace, number formatting), so genuine Meta
  // signatures would fail against it while a same-shape forged payload with
  // no signature at all previously fell through to the fail-open branch above.
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');

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
