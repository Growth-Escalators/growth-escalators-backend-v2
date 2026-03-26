import { db, marketingAccounts } from '../db/index';
import { eq, sql } from 'drizzle-orm';
import { sendSlackDM } from './slackService';
import { SLACK_IDS } from '../utils/clickupSlack';
import { logAuditEvent } from '../utils/audit';

const META_API_BASE = 'https://graph.facebook.com/v19.0';
const ALERT_COOLDOWN_HOURS = 6;

async function getTenantId(): Promise<string | null> {
  try {
    const result = await db.execute(sql`SELECT id FROM tenants WHERE slug = 'growth-escalators' LIMIT 1`);
    return (result.rows[0] as { id: string } | undefined)?.id ?? null;
  } catch { return null; }
}

export async function checkSpendAlerts(): Promise<{ checked: number; alerted: number }> {
  console.log('[spend-alert] checking balances…');

  const token = process.env.META_ADS_TOKEN || process.env.META_ACCESS_TOKEN;
  if (!token) {
    console.log('[spend-alert] no Meta token — skipping');
    return { checked: 0, alerted: 0 };
  }

  const accounts = await db.select().from(marketingAccounts)
    .where(eq(marketingAccounts.isActive, true));

  let alerted = 0;

  for (const acct of accounts) {
    try {
      // Check cooldown
      if (acct.lastAlertSentAt) {
        const hoursSinceAlert = (Date.now() - new Date(acct.lastAlertSentAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceAlert < ALERT_COOLDOWN_HOURS) continue;
      }

      // Fetch account balance + daily_budget from Meta
      const url = `${META_API_BASE}/${acct.accountId}?fields=balance,daily_budget,name,currency&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json() as Record<string, unknown>;

      if (data.error) {
        console.error(`[spend-alert] Meta API error for ${acct.accountName}:`, (data.error as Record<string,string>).message);
        continue;
      }

      // Meta returns balance and daily_budget in account currency cents
      const balance = Number(data.balance || 0) / 100;
      const dailyBudget = Number(data.daily_budget || 0) / 100;

      // Alert when balance < daily_budget
      if (dailyBudget <= 0 || balance >= dailyBudget) continue;

      const msg = `⚠️ *Low Balance Alert — ${acct.accountName}*\n\n` +
        `Current balance: ₹${balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}\n` +
        `Daily budget: ₹${dailyBudget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}\n` +
        `Balance is below daily budget — campaigns may pause soon.\n` +
        `Top up at: business.facebook.com/ads/manager`;

      // DM Vishal + Jatin
      await sendSlackDM(SLACK_IDS.vishal, msg);
      await sendSlackDM(SLACK_IDS.jatin, msg);

      // Update last alert time
      await db.update(marketingAccounts)
        .set({ lastAlertSentAt: new Date() })
        .where(eq(marketingAccounts.id, acct.id));

      // Log to audit
      const tenantId = await getTenantId();
      if (tenantId) {
        await logAuditEvent(null, tenantId, 'SPEND_ALERT', 'ad_account', acct.id, {
          accountName: acct.accountName, balance, dailyBudget,
        });
      }

      alerted++;
    } catch (e) {
      console.error(`[spend-alert] error for ${acct.accountName}:`, e);
    }
  }

  console.log(`[spend-alert] done — checked: ${accounts.length}, alerted: ${alerted}`);
  return { checked: accounts.length, alerted };
}
