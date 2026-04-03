import logger from '../utils/logger';
import { fetchTasksForMember, fetchCompletedTodayForMember, type Task } from '../utils/clickupTasks';
import { sendSlackMessage, sendSlackDM } from './slackService';
import { pool } from '../db/index';
import {
  SLACK_SOD_EOD_CHANNEL,
  SLACK_JATIN, SLACK_SAKCHAM, SLACK_VISHAL, SLACK_NIMISHA, SLACK_KESHAV,
  CLICKUP_JATIN, CLICKUP_SAKCHAM, CLICKUP_VISHAL, CLICKUP_NIMISHA, CLICKUP_KESHAV,
} from '../config/constants';

const SOD_EOD_CHANNEL = SLACK_SOD_EOD_CHANNEL;

const TEAM = [
  { name: 'Jatin',   clickupId: String(CLICKUP_JATIN),   slackId: SLACK_JATIN,   showTeamOverview: true  },
  { name: 'Sakcham', clickupId: String(CLICKUP_SAKCHAM),  slackId: SLACK_SAKCHAM,  showTeamOverview: true  },
  { name: 'Vishal',  clickupId: String(CLICKUP_VISHAL),   slackId: SLACK_VISHAL,   showTeamOverview: false },
  { name: 'Nimisha', clickupId: String(CLICKUP_NIMISHA),  slackId: SLACK_NIMISHA,  showTeamOverview: false },
  { name: 'Keshav',  clickupId: String(CLICKUP_KESHAV),   slackId: SLACK_KESHAV,   showTeamOverview: false },
];

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function fmtOverdue(tasks: Task[]): string {
  return tasks.map(t => {
    const ago = t.daysOverdue === 1 ? '1 day ago' : `${t.daysOverdue} days ago`;
    return `  • ${t.name}${t.listName ? ` — ${t.listName}` : ''} _(due ${ago})_`;
  }).join('\n');
}
function fmtToday(tasks: Task[]): string {
  return tasks.map(t => `  • ${t.name}${t.listName ? ` — ${t.listName}` : ''}`).join('\n');
}
function fmtUpcoming(tasks: Task[]): string {
  return tasks.map(t => `  • ${t.name}${t.listName ? ` — ${t.listName}` : ''} _(due ${t.dueDateFormatted})_`).join('\n');
}
function fmtCompleted(tasks: Task[]): string {
  return tasks.map(t => {
    let line = `✓ ${t.name}`;
    if (t.listName) line += ` — _${t.listName}_`;
    if (t.daysOverdue > 0) line += ` ⚠️ _was ${t.daysOverdue}d overdue_`;
    return line;
  }).join('\n');
}
function fmtOpen(tasks: Task[]): string {
  return tasks.map(t => {
    if (t.daysOverdue > 0) return `• ${t.name} — _${t.daysOverdue} day${t.daysOverdue === 1 ? '' : 's'} overdue_ ⚠️`;
    return `• ${t.name}`;
  }).join('\n');
}

type MemberResult = {
  member: typeof TEAM[0];
  overdue: Task[];
  dueToday: Task[];
  upcoming: Task[];
  all: Task[];
};

// -----------------------------------------------------------------------
// SOD Digest
// -----------------------------------------------------------------------
export async function sendSODDigest(): Promise<{ sent: number; errors: string[] }> {
  console.log('[SOD] starting digest…');
  const errors: string[] = [];
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const results: MemberResult[] = await Promise.all(
    TEAM.map(async (m) => {
      try {
        const data = await fetchTasksForMember(m.clickupId);
        return { member: m, ...data };
      } catch (e) {
        logger.error(`[SOD] fetch failed for ${m.name}:`, e);
        errors.push(`fetch: ${m.name}`);
        return { member: m, overdue: [], dueToday: [], upcoming: [], all: [] };
      }
    })
  );

  let sent = 0;

  // Send in order: Jatin, Sakcham, Vishal, Nimisha, Keshav
  for (const mr of results) {
    try {
      let msg = '';

      // Team overview for Jatin and Sakcham
      if (mr.member.showTeamOverview) {
        const totalOverdue = results.reduce((s, r) => s + r.overdue.length, 0);
        const othersForOverview = results.filter(r => r.member.clickupId !== mr.member.clickupId);

        msg += `📊 *Team Overview — ${dateStr}*\n\nOverdue across team: *${totalOverdue}*\n`;
        for (const o of othersForOverview) {
          msg += `- <@${o.member.slackId}> (${o.member.name}): ${o.overdue.length} overdue\n`;
        }
        msg += `\n━━━━━━━━━━━━━━━━━━\n📋 *Your tasks, ${mr.member.name}:*\n`;
        msg += buildTaskSection(mr);
      } else {
        // Regular members — no overview
        const total = mr.overdue.length + mr.dueToday.length + mr.upcoming.length;
        if (total === 0 && mr.all.length === 0) {
          msg = `📋 Good morning <@${mr.member.slackId}>! 🎉\nYour task list is clear today. Add tasks in ClickUp if needed.`;
        } else {
          msg = `📋 Good morning <@${mr.member.slackId}> — here's your day:\n\n`;
          msg += buildTaskSection(mr);
        }
      }

      const ok = await sendSlackMessage(SOD_EOD_CHANNEL, msg);
      if (ok) { sent++; console.log(`[SOD] sent for ${mr.member.name}`); }
      else { errors.push(`post: ${mr.member.name}`); }
    } catch (e) { errors.push(`${mr.member.name}: ${e}`); }
    await delay(2000);
  }

  console.log(`[SOD] complete — sent: ${sent}/${TEAM.length}, errors: ${errors.length}`);
  return { sent, errors };
}

function buildTaskSection(r: MemberResult): string {
  const total = r.overdue.length + r.dueToday.length + r.upcoming.length;
  let msg = '';
  if (r.overdue.length > 0) msg += `🔴 *Overdue (${r.overdue.length}):*\n${fmtOverdue(r.overdue)}\n\n`;
  if (r.dueToday.length > 0) msg += `🟡 *Due Today (${r.dueToday.length}):*\n${fmtToday(r.dueToday)}\n\n`;
  if (r.upcoming.length > 0) msg += `🟢 *Upcoming (${r.upcoming.length}):*\n${fmtUpcoming(r.upcoming)}\n\n`;
  if (total > 0) msg += `_${total} tasks total · Have a great day! 💪_`;
  else if (r.all.length > 0) msg += `_${r.all.length} tasks with no due date._`;
  return msg;
}

// -----------------------------------------------------------------------
// EOD Summary
// -----------------------------------------------------------------------
type EODResult = { member: typeof TEAM[0]; completed: Task[]; openTasks: Task[]; overdue: Task[] };

export async function sendEODSummary(): Promise<{ sent: number; errors: string[] }> {
  console.log('[EOD] starting summary…');
  const errors: string[] = [];
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const results: EODResult[] = await Promise.all(
    TEAM.map(async (m) => {
      try {
        const [completed, taskData] = await Promise.all([
          fetchCompletedTodayForMember(m.clickupId),
          fetchTasksForMember(m.clickupId),
        ]);
        return { member: m, completed, openTasks: taskData.all, overdue: taskData.overdue };
      } catch (e) {
        logger.error(`[EOD] fetch failed for ${m.name}:`, e);
        errors.push(`fetch: ${m.name}`);
        return { member: m, completed: [] as Task[], openTasks: [] as Task[], overdue: [] as Task[] };
      }
    })
  );

  let sent = 0;

  for (const mr of results) {
    try {
      let msg = '';

      if (mr.member.showTeamOverview) {
        const totalCompleted = results.reduce((s, r) => s + r.completed.length, 0);
        const othersForOverview = results.filter(r => r.member.clickupId !== mr.member.clickupId);

        msg += `📊 *Team EOD — ${dateStr}*\n\nCompleted today across team: *${totalCompleted}*\n`;
        for (const o of othersForOverview) {
          msg += `• <@${o.member.slackId}>: ${o.completed.length} done, ${o.openTasks.length} open\n`;
        }
        msg += `\n━━━━━━━━━━━━━━━━━━\n`;
      }

      msg += buildEODSection(mr);

      const ok = await sendSlackMessage(SOD_EOD_CHANNEL, msg);
      if (ok) { sent++; console.log(`[EOD] sent for ${mr.member.name}`); }
      else { errors.push(`post: ${mr.member.name}`); }
    } catch (e) { errors.push(`${mr.member.name}: ${e}`); }
    await delay(2000);
  }

  // --- Patterns + Improvements (one final message for Jatin & Sakcham) ---
  try {
    const patternsMsg = buildPatternsAndImprovements(results, dateStr);
    if (patternsMsg) {
      await delay(2000);
      const ok = await sendSlackMessage(SOD_EOD_CHANNEL, patternsMsg);
      if (ok) { sent++; console.log('[EOD] sent patterns + improvements'); }
      else { errors.push('post: patterns'); }
    }
  } catch (e) { errors.push(`patterns: ${e}`); }

  console.log(`[EOD] complete — sent: ${sent}/${TEAM.length}, errors: ${errors.length}`);
  return { sent, errors };
}

function buildPatternsAndImprovements(results: EODResult[], dateStr: string): string | null {
  const totalCompleted = results.reduce((s, r) => s + r.completed.length, 0);
  const totalOverdue = results.reduce((s, r) => s + r.overdue.length, 0);
  if (totalCompleted === 0 && totalOverdue === 0) return null;

  let msg = `🔍 *Team Patterns & Improvements — ${dateStr}*\n\n`;

  // --- Patterns ---
  msg += `*📌 Patterns:*\n`;
  let patternCount = 0;

  // Pattern 1: Who has the most overdue tasks
  const overdueByMember = results
    .filter(r => r.overdue.length > 0)
    .sort((a, b) => b.overdue.length - a.overdue.length);
  if (overdueByMember.length > 0) {
    const top = overdueByMember[0];
    msg += `• <@${top.member.slackId}> has the most overdue tasks (${top.overdue.length})`;
    const worst = top.overdue.reduce((a, b) => a.daysOverdue > b.daysOverdue ? a : b);
    if (worst.daysOverdue >= 3) {
      msg += ` — oldest: _"${worst.name}"_ (${worst.daysOverdue}d)`;
    }
    msg += `\n`;
    patternCount++;
  }

  // Pattern 2: Which list/category keeps slipping
  const listSlipCount: Record<string, number> = {};
  for (const r of results) {
    for (const t of r.overdue) {
      const key = t.listName || 'Unassigned list';
      listSlipCount[key] = (listSlipCount[key] || 0) + 1;
    }
  }
  const slippingLists = Object.entries(listSlipCount)
    .sort(([, a], [, b]) => b - a)
    .filter(([, count]) => count >= 2);
  if (slippingLists.length > 0) {
    const [listName, count] = slippingLists[0];
    msg += `• *${listName}* has ${count} overdue tasks across the team — recurring bottleneck\n`;
    patternCount++;
  }

  // Pattern 3: Members with 0 completions
  const zeroDone = results.filter(r => r.completed.length === 0 && r.openTasks.length > 0);
  if (zeroDone.length > 0) {
    const names = zeroDone.map(r => `<@${r.member.slackId}>`).join(', ');
    msg += `• ${names} had open tasks but completed none today\n`;
    patternCount++;
  }

  // Pattern 4: Tasks completed that were overdue
  const lateCompletions = results.reduce((s, r) => s + r.completed.filter(t => t.daysOverdue > 0).length, 0);
  if (lateCompletions > 0 && totalCompleted > 0) {
    const pct = Math.round((lateCompletions / totalCompleted) * 100);
    msg += `• ${lateCompletions} of ${totalCompleted} completed tasks (${pct}%) were overdue at completion\n`;
    patternCount++;
  }

  if (patternCount === 0) {
    msg += `• No concerning patterns today ✅\n`;
  }

  // --- Improvements ---
  msg += `\n*💡 Team Improvements:*\n`;
  const suggestions: string[] = [];

  if (lateCompletions > 0 && totalCompleted > 0 && lateCompletions / totalCompleted > 0.4) {
    suggestions.push(`Over 40% of today's completions were overdue — consider breaking large tasks into smaller sub-tasks with tighter due dates`);
  }

  if (zeroDone.length > 0) {
    suggestions.push(`${zeroDone.map(r => r.member.name).join(' & ')} had zero completions — check if they're blocked or need task reassignment`);
  }

  if (slippingLists.length > 0) {
    suggestions.push(`"${slippingLists[0][0]}" keeps slipping — assign a single owner to triage and unblock that list`);
  }

  if (overdueByMember.length > 0) {
    const top = overdueByMember[0];
    if (top.overdue.length >= 3) {
      suggestions.push(`${top.member.name} is carrying ${top.overdue.length} overdue tasks — do a quick 5-min standup to prioritize or delegate`);
    }
  }

  const totalOpen = results.reduce((s, r) => s + r.openTasks.length, 0);
  if (totalCompleted > 0 && totalOpen > totalCompleted * 3) {
    suggestions.push(`Team has ${totalOpen} open tasks vs ${totalCompleted} completed today — review backlog for tasks that can be closed or deprioritized`);
  }

  // Pick top 3 most relevant
  const picked = suggestions.slice(0, 3);
  if (picked.length === 0) {
    picked.push('Solid day — keep the momentum going tomorrow');
  }
  for (const s of picked) {
    msg += `• ${s}\n`;
  }

  return msg;
}

function buildEODSection(r: EODResult): string {
  if (r.completed.length === 0) {
    return `📝 *EOD — <@${r.member.slackId}>*\nNo tasks completed today.\nOpen: ${r.openTasks.length} tasks\n_Remember to update ClickUp as you finish work!_`;
  }
  let msg = `✅ *EOD Summary — <@${r.member.slackId}>*\n\n`;
  msg += `*Completed today (${r.completed.length}):*\n${fmtCompleted(r.completed)}\n\n`;
  if (r.openTasks.length > 0) msg += `*Still open (${r.openTasks.length}):*\n${fmtOpen(r.openTasks)}\n\n`;
  const overdueCompleted = r.completed.filter(t => t.daysOverdue > 0).length;
  if (overdueCompleted > 0) {
    msg += `_${r.completed.length} done (${overdueCompleted} were overdue) · ${r.openTasks.length} carry forward_`;
  } else {
    msg += `_${r.completed.length} done · ${r.openTasks.length} carry forward_`;
  }
  return msg;
}

// -----------------------------------------------------------------------
// Sakcham's Priority SOD — sent as a DM at 10 AM Mon-Sat
// Shows: agency owners needing follow-up + D2C hot leads (bump2 purchased)
// Does NOT show: scoring internals, automation details, freelancer pipeline
// -----------------------------------------------------------------------
export async function sendSakhamSOD(): Promise<void> {
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  // Priority 1: Agency owners stuck in Paid ₹9 for >24h with no appointment booked
  let agencyRows: Array<{ name: string; phone: string | null; email: string | null; placed_at: Date; hours_waiting: number }> = [];
  try {
    const agencyResult = await pool.query(`
      SELECT
        c.first_name || COALESCE(' ' || c.last_name, '') AS name,
        (SELECT channel_value FROM contact_channels
         WHERE contact_id = c.id AND channel_type = 'whatsapp' LIMIT 1) AS phone,
        (SELECT channel_value FROM contact_channels
         WHERE contact_id = c.id AND channel_type = 'email' AND is_primary = true LIMIT 1) AS email,
        pc.placed_at,
        EXTRACT(EPOCH FROM (NOW() - pc.placed_at)) / 3600 AS hours_waiting
      FROM contacts c
      JOIN pipeline_contacts pc ON pc.contact_id = c.id
      JOIN pipelines p ON p.id = pc.pipeline_id
      WHERE p.name = 'Agency Owners'
        AND pc.stage_name = 'Paid ₹9'
        AND pc.placed_at < NOW() - INTERVAL '24 hours'
        AND NOT ('appt_booked' = ANY(c.tags))
      ORDER BY pc.placed_at ASC
      LIMIT 10
    `);
    agencyRows = agencyResult.rows as typeof agencyRows;
  } catch (e) {
    logger.error('[SakhamSOD] agency query failed:', e);
  }

  // Priority 2: D2C contacts with audit call (bump2) in last 48h, no appointment booked
  let d2cAuditRows: Array<{ name: string; phone: string | null; email: string | null; created_at: Date; hours_ago: number }> = [];
  try {
    const d2cResult = await pool.query(`
      SELECT
        c.first_name || COALESCE(' ' || c.last_name, '') AS name,
        (SELECT channel_value FROM contact_channels
         WHERE contact_id = c.id AND channel_type = 'whatsapp' LIMIT 1) AS phone,
        (SELECT channel_value FROM contact_channels
         WHERE contact_id = c.id AND channel_type = 'email' AND is_primary = true LIMIT 1) AS email,
        c.created_at,
        EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600 AS hours_ago
      FROM contacts c
      WHERE 'bump2' = ANY(c.tags)
        AND (c.metadata->>'segment' = 'd2c' OR c.metadata->>'segment' = 'ecom_brand' OR 'ecom_brand' = ANY(c.tags))
        AND c.created_at > NOW() - INTERVAL '48 hours'
        AND NOT ('appt_booked' = ANY(c.tags))
      ORDER BY c.created_at DESC
      LIMIT 10
    `);
    d2cAuditRows = d2cResult.rows as typeof d2cAuditRows;
  } catch (e) {
    logger.error('[SakhamSOD] d2c audit query failed:', e);
  }

  // Build message
  let msg = `📋 *Your Priority SOD — ${dateStr}*\n\n`;

  if (agencyRows.length === 0 && d2cAuditRows.length === 0) {
    msg += `✅ No priority follow-ups today. All clear!\n`;
  }

  if (agencyRows.length > 0) {
    msg += `🏢 *Agency Owners — need follow-up (stuck in Paid ₹9 > 24h)*\n`;
    for (const r of agencyRows) {
      const hrs = Math.round(r.hours_waiting);
      msg += `  • ${r.name} | ${r.phone ?? 'no phone'} | ${r.email ?? 'no email'} | waiting ${hrs}h\n`;
    }
    msg += `\n_Action: Call to book discovery / whitelist call_\n\n`;
  }

  if (d2cAuditRows.length > 0) {
    msg += `🎯 *D2C Hot Leads — bought audit call, no booking yet*\n`;
    for (const r of d2cAuditRows) {
      const hrs = Math.round(r.hours_ago);
      msg += `  • ${r.name} | ${r.phone ?? 'no phone'} | ${r.email ?? 'no email'} | bought ${hrs}h ago\n`;
    }
    msg += `\n_Action: Confirm audit call booking link was sent_\n`;
  }

  msg += `\n_Sent automatically at 10 AM · Reply DONE to mark follow-ups complete_`;

  await sendSlackDM(SLACK_SAKCHAM, msg);
  logger.info(`[SakhamSOD] sent — agency: ${agencyRows.length}, d2c_audit: ${d2cAuditRows.length}`);
}
