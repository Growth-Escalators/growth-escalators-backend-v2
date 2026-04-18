import https from 'https';
import { pool } from '../db/index';
import logger from '../utils/logger';
import { CLICKUP_SAKCHAM } from '../config/constants';

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN;
// Use a dedicated SEO list if set, otherwise fall back to the main list
const SEO_LIST_ID = process.env.CLICKUP_SEO_LIST_ID ?? process.env.CLICKUP_LIST_ID ?? '';

async function clickupPost(listId: string, body: unknown): Promise<{ id: string; url: string } | null> {
  if (!CLICKUP_TOKEN || !listId) return null;
  const bodyStr = JSON.stringify(body);
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.clickup.com',
      path: `/api/v2/list/${listId}/task`,
      method: 'POST',
      headers: {
        Authorization: CLICKUP_TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data) as { id?: string; url?: string };
          resolve(parsed.id ? { id: parsed.id, url: parsed.url ?? '' } : null);
        } catch { resolve(null); }
      });
    });
    req.on('error', (e) => { logger.error('[seo-clickup] request error:', e.message); resolve(null); });
    req.write(bodyStr);
    req.end();
  });
}

export async function createOpportunityTask(opp: {
  id?: string;   // optional — if provided, updates seo_opportunities.clickup_task_id
  client_domain: string;
  opportunity_type: string;
  description: string;
  estimated_impact: string;
  keyword?: string | null;
  priority_score?: number;
}): Promise<void> {
  if (!SEO_LIST_ID) {
    logger.warn('[seo-clickup] CLICKUP_SEO_LIST_ID / CLICKUP_LIST_ID not set — skipping ClickUp task');
    return;
  }
  if (!CLICKUP_TOKEN) {
    logger.warn('[seo-clickup] CLICKUP_API_TOKEN not set — skipping ClickUp task');
    return;
  }

  const priority = opp.estimated_impact === 'high' ? 2 : opp.estimated_impact === 'medium' ? 3 : 4;
  const taskName = `[SEO] ${opp.client_domain} — ${opp.opportunity_type}${opp.keyword ? `: ${opp.keyword}` : ''}`;
  const lines = [
    `**Client:** ${opp.client_domain}`,
    `**Type:** ${opp.opportunity_type}`,
    opp.keyword ? `**Keyword:** ${opp.keyword}` : null,
    `**Impact:** ${opp.estimated_impact}`,
    `**Description:** ${opp.description}`,
    `**Priority score:** ${opp.priority_score ?? 0}`,
    '',
    'Once the fix is published, mark this task Done. Add the published URL back to the SEO opportunity record.',
  ].filter((l): l is string => l !== null);

  try {
    const result = await clickupPost(SEO_LIST_ID, {
      name: taskName,
      description: lines.join('\n'),
      assignees: [CLICKUP_SAKCHAM],
      tags: ['seo', opp.opportunity_type],
      priority,
      due_date: Date.now() + 7 * 86400 * 1000,
      notify_all: false,
    });

    if (result && opp.id) {
      await pool.query(
        `UPDATE seo_opportunities SET clickup_task_id = $1, clickup_task_url = $2 WHERE id = $3`,
        [result.id, result.url, opp.id],
      );
      logger.info(`[seo-clickup] task ${result.id} created for opportunity ${opp.id}`);
    } else if (result) {
      logger.info(`[seo-clickup] task ${result.id} created (no opportunity id to update)`);
    }
  } catch (e) {
    logger.warn('[seo-clickup] task creation failed:', e instanceof Error ? e.message : String(e));
  }
}
