import { pool } from '../db/index';
import logger from '../utils/logger';
import { sendSlackMessage } from './slackService';
import { SLACK_OUTREACH_CHANNEL } from '../config/constants';

interface EnrichmentResult {
  processed: number;
  active: number;
  notFound: number;
  errors: number;
}

/**
 * Backend enrichment for leads stuck in Enriching or New.
 * Bypasses n8n WF-01 — runs directly from the backend.
 */
export async function enrichStuckLeads(): Promise<EnrichmentResult> {
  const hunterKey = process.env.HUNTER_API_KEY;

  // Find leads stuck in Enriching >15min OR still New (batch of 20)
  const result = await pool.query(`
    SELECT id, company, first_name, website_url, email
    FROM outreach_leads
    WHERE (status = 'Enriching' AND updated_at < NOW() - INTERVAL '15 minutes')
       OR (status = 'New')
    ORDER BY created_at ASC
    LIMIT 20
  `);

  if (result.rows.length === 0) return { processed: 0, active: 0, notFound: 0, errors: 0 };

  let active = 0, notFound = 0, errors = 0;
  const leads = result.rows as Array<{
    id: number; company: string; first_name: string | null;
    website_url: string | null; email: string | null;
  }>;

  for (const lead of leads) {
    try {
      // Skip if already has email
      if (lead.email && lead.email.includes('@')) {
        await markActive(lead.id, lead.email, lead.first_name, lead.company);
        active++;
        continue;
      }

      // Extract domain from website_url
      const domain = extractDomain(lead.website_url);
      if (!domain) {
        await markNotFound(lead.id, 'No website URL');
        notFound++;
        continue;
      }

      // Try Hunter.io
      let email: string | null = null;
      let firstName = lead.first_name;

      if (hunterKey) {
        try {
          const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterKey}&limit=5`;
          const res = await fetch(hunterUrl, { signal: AbortSignal.timeout(10000) });
          if (res.ok) {
            const data = await res.json() as { data?: { emails?: Array<{ value: string; first_name?: string; last_name?: string }> } };
            const emails = data.data?.emails ?? [];
            if (emails.length > 0) {
              email = emails[0].value;
              if (!firstName && emails[0].first_name) firstName = emails[0].first_name;
            }
          }
        } catch (e) {
          logger.warn(`[enrichment] Hunter failed for ${domain}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      if (email) {
        await markActive(lead.id, email, firstName, lead.company);
        active++;
      } else {
        await markNotFound(lead.id, hunterKey ? 'No email found via Hunter' : 'HUNTER_API_KEY not configured');
        notFound++;
      }

      // Rate limit: 1 request per second
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      logger.error(`[enrichment] Lead ${lead.id} failed:`, e instanceof Error ? e.message : String(e));
      errors++;
    }
  }

  const summary = { processed: leads.length, active, notFound, errors };
  logger.info(`[enrichment] Batch complete: ${JSON.stringify(summary)}`);

  // Post to Slack
  if (leads.length > 0) {
    await sendSlackMessage(SLACK_OUTREACH_CHANNEL,
      `🔄 *Enrichment batch complete*\n` +
      `Processed: ${leads.length} · Active: ${active} · Not Found: ${notFound} · Errors: ${errors}`,
    ).catch(() => {});
  }

  return summary;
}

async function markActive(leadId: number, email: string, firstName: string | null, company: string): Promise<void> {
  const icebreaker = `I came across ${company} and was impressed by your work in performance marketing. I would love to share how we help agencies like yours scale their D2C client base.`;

  await pool.query(`
    UPDATE outreach_leads
    SET status = 'Active',
        email = $1,
        first_name = COALESCE($2, first_name),
        icebreaker = $3,
        enriched_at = NOW(),
        updated_at = NOW()
    WHERE id = $4
  `, [email, firstName, icebreaker, leadId]);
}

async function markNotFound(leadId: number, reason: string): Promise<void> {
  await pool.query(`
    UPDATE outreach_leads
    SET status = 'Not_Found', notes = $1, updated_at = NOW()
    WHERE id = $2
  `, [reason, leadId]);

  await pool.query(`
    INSERT INTO outreach_errors (lead_id, workflow, error_type, error_message)
    VALUES ($1, 'backend-enrichment', 'Permanent', $2)
  `, [leadId, reason]).catch(() => {});
}

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    let u = url.trim();
    if (!u.startsWith('http')) u = 'https://' + u;
    const parsed = new URL(u);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    // Try as bare domain
    const match = url.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
    return match ? match[1] : null;
  }
}
