import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the database module before importing the middleware
// ---------------------------------------------------------------------------
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

vi.mock('../db/index', () => ({
  db: {
    select: () => ({ from: mockFrom }),
  },
  processedEvents: { eventId: 'event_id' },
}));

// Override the chained query methods
mockFrom.mockReturnValue({ where: mockWhere });
mockWhere.mockReturnValue({ limit: mockLimit });

import { checkIdempotency } from '../middleware/idempotency';

// ---------------------------------------------------------------------------
// Helper to create mock Express req/res/next
// ---------------------------------------------------------------------------
function createMocks(body: Record<string, unknown> = {}) {
  const req = {
    body,
    method: 'POST',
    path: '/webhooks/test',
  } as any;

  const resJson = vi.fn();
  const resStatus = vi.fn().mockReturnValue({ json: resJson });
  const res = {
    status: resStatus,
    json: resJson,
  } as any;

  const next = vi.fn();

  return { req, res, next, resJson, resStatus };
}

describe('Idempotency Middleware', () => {
  const middleware = checkIdempotency('test');

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
  });

  it('passes through first call with an event ID', async () => {
    mockLimit.mockResolvedValue([]); // No existing record

    const { req, res, next } = createMocks({ eventId: 'evt-123' });

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.idempotencyKey).toBe('test:evt-123');
  });

  it('returns 200 without processing on duplicate event ID', async () => {
    mockLimit.mockResolvedValue([{ id: 'some-uuid', eventId: 'test:evt-123' }]); // Already exists

    const { req, res, next, resJson } = createMocks({ eventId: 'evt-123' });

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(resJson).toHaveBeenCalledWith({
      status: 'already_processed',
      key: 'test:evt-123',
    });
  });

  it('different event IDs both pass through', async () => {
    mockLimit.mockResolvedValue([]); // No existing records

    const mock1 = createMocks({ eventId: 'evt-111' });
    const mock2 = createMocks({ eventId: 'evt-222' });

    await middleware(mock1.req, mock1.res, mock1.next);
    await middleware(mock2.req, mock2.res, mock2.next);

    expect(mock1.next).toHaveBeenCalled();
    expect(mock2.next).toHaveBeenCalled();
    expect(mock1.req.idempotencyKey).toBe('test:evt-111');
    expect(mock2.req.idempotencyKey).toBe('test:evt-222');
  });

  it('extracts ID from nested body paths (responseId)', async () => {
    mockLimit.mockResolvedValue([]);

    const { req, res, next } = createMocks({
      data: { responseId: 'resp-456' },
    });

    await middleware(req, res, next);

    expect(req.idempotencyKey).toBe('test:resp-456');
  });

  it('generates key from empty body (String(undefined) fallback)', async () => {
    mockLimit.mockResolvedValue([]);

    const { req, res, next } = createMocks({});

    await middleware(req, res, next);

    // When no ID fields present, body?.id is undefined → String('') → key is 'test:'
    expect(req.idempotencyKey).toBe('test:');
    expect(next).toHaveBeenCalled();
  });
});
