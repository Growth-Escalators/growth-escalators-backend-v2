import https from 'https';
import {
  TEAM_MEMBERS, SLACK_IDS,
  formatTaskList, delay,
} from '../utils/clickupSlack';
import { sendSlackDM, sendSlackMessage } from './slackService';

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID;

interface ClickUpTask {
  id: string;
  name: string;
  status: { status: string; type: string };
  due_date: string | null;
  date_updated: string;
  [key: string]: unknown;
}

function fetchTasks(assigneeId: string, statuses: string[], includeClosedOpt = false, dateUpdatedGt?: number): Promise<ClickUpTask[]> {
  if (!CLICKUP_TOKEN || !CLICKUP_LIST_ID) return Promise.resolve([]);

  return new Promise(resolve => {
    const params = new URLSearchParams();
    params.set('assignees[]', assigneeId);
    statuses.forEach(s => params.append('statuses[]', s));
    params.set('include_closed', String(includeClosedOpt));
    if (dateUpdatedGt) params.set('date_updated_gt', String(dateUpdatedGt));

    const path = `/api/v2/list/${CLICKUP_LIST_ID}/task?${params.toString()}`;

    https.get({
      hostname: 'api.clickup.com',
      path,
      headers: { Authorization: CLICKUP_TOKEN! },
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data) as { tasks?: ClickUpTask[] };
          resolve(parsed.tasks || []);
        } catch { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

function todayStart(): number {
  // Use IST (UTC+5:30) for "today" calculations
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  istNow.setUTCHours(0, 0, 0, 0);
  return istNow.getTime() - istOffset;
}

function todayEnd(): number {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  istNow.setUTCHours(23, 59, 59, 999);
  return istNow.getTime() - istOffset;
}

function threeDaysFromNow(): number {
  return Date.now() + 3 * 24 * 60 * 60 * 1000;
}

function categorizeTasks(tasks: ClickUpTask[]): {
  overdue: ClickUpTask[];
  today: ClickUpTask[];
  upcoming: ClickUpTask[];
  open: ClickUpTask[];
} {
  const todayS = todayStart();
  const todayE = todayEnd();
  const threeDays = threeDaysFromNow();

  const overdue: ClickUpTask[] = [];
  const today: ClickUpTask[] = [];
  const upcoming: ClickUpTask[] = [];
  const open: ClickUpTask[] = [];

  for (const t of tasks) {
    const statusType = t.status?.type?.toLowerCase();
    if (statusType === 'closed' || statusType === 'done') continue;

    if (!t.due_date) {
      open.push(t);
      continue;
    }

    const dueMs = Number(t.due_date);
    if (dueMs < todayS) {
      overdue.push(t);
    } else if (dueMs >= todayS && dueMs <= todayE) {
      today.push(t);
    } else if (dueMs > todayE && dueMs <= threeDays) {
      upcoming.push(t);
    } else {
      open.push(t);
    }
  }

  return { overdue, today, upcoming, open };
}

// -----------------------------------------------------------------------
// SOD Digest — sends personal DM to each team member
// -----------------------------------------------------------------------
export async function runSodDigest(): Promise<{ sent: number; errors: string[] }> {
  console.log('[SOD] starting digest…');
  const errors: string[] = [];

  if (!CLICKUP_TOKEN || !CLICKUP_LIST_ID) {
    console.log('[SOD] ClickUp not configured — skipping');
    return { sent: 0, errors: ['ClickUp not configured'] };
  }

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  const memberData: Array<{
    member: typeof TEAM_MEMBERS[0];
    overdue: ClickUpTask[];
    today: ClickUpTask[];
    upcoming: ClickUpTask[];
    total: number;
  }> = [];

  for (const member of TEAM_MEMBERS) {
    try {
      const tasks = await fetchTasks(member.clickupId, ['open', 'in progress', 'to do', 'in review']);
      const cats = categorizeTasks(tasks);
      memberData.push({
        member,
        overdue: cats.overdue,
        today: cats.today,
        upcoming: cats.upcoming,
        total: cats.overdue.length + cats.today.length + cats.upcoming.length + cats.open.length,
      });
    } catch (e) {
      console.error(`[SOD] fetch failed for ${member.name}:`, e);
      errors.push(`fetch failed for ${member.name}`);
      memberData.push({ member, overdue: [], today: [], upcoming: [], total: 0 });
    }
    await delay(300);
  }

  // Post order: Jatin first, then others
  const jatinData = memberData.find(m => m.member.clickupId === '88911769');
  const otherMembers = memberData.filter(m => m.member.clickupId !== '88911769');
  const orderedMembers = jatinData ? [jatinData, ...otherMembers] : otherMembers;

  let sent = 0;

  for (const md of orderedMembers) {
    const { member, overdue, today, upcoming, total } = md;

    try {
      let msg = '';

      // Jatin gets team overview at top
      if (member.clickupId === '88911769') {
        const totalOverdue = memberData.reduce((sum, m) => sum + m.overdue.length, 0);
        msg += `📊 *Team Overview — ${dateStr}*\n`;
        msg += `Overdue across team: *${totalOverdue}*\n\n`;
        for (const om of otherMembers) {
          msg += `${om.member.name}: ${om.overdue.length} overdue\n`;
        }
        msg += `\n---\n\n`;
      }

      if (total === 0) {
        msg += `📋 Good morning ${member.name} — your task list is clear today! 🎉\nAdd tasks in ClickUp if needed.`;
      } else {
        msg += `📋 Good morning ${member.name} — here's your day:\n`;

        if (overdue.length > 0) {
          msg += `🔴 *Overdue (${overdue.length}):*\n`;
          msg += formatTaskList(overdue, 'overdue') + '\n';
        }
        if (today.length > 0) {
          msg += `🟡 *Due Today (${today.length}):*\n`;
          msg += formatTaskList(today, 'today') + '\n';
        }
        if (upcoming.length > 0) {
          msg += `🟢 *Upcoming (${upcoming.length}):*\n`;
          msg += formatTaskList(upcoming, 'upcoming') + '\n';
        }

        msg += `\n${total} tasks total · Have a great day!`;
      }

      // Send as personal DM
      const ok = await sendSlackDM(member.slackId, msg);
      if (ok) {
        sent++;
        console.log(`[SOD] DM sent to ${member.name}`);
      } else {
        errors.push(`DM failed for ${member.name} (${member.slackId})`);
        console.error(`[SOD] DM failed for ${member.name}`);
      }
    } catch (e) {
      errors.push(`error for ${member.name}: ${e instanceof Error ? e.message : String(e)}`);
      console.error(`[SOD] error for ${member.name}:`, e);
    }

    await delay(2000);
  }

  console.log(`[SOD] digest complete — sent: ${sent}/${memberData.length}, errors: ${errors.length}`);
  return { sent, errors };
}

// -----------------------------------------------------------------------
// EOD Summary — sends personal DM to each team member
// -----------------------------------------------------------------------
export async function runEodSummary(): Promise<{ sent: number; errors: string[] }> {
  console.log('[EOD] starting summary…');
  const errors: string[] = [];

  if (!CLICKUP_TOKEN || !CLICKUP_LIST_ID) {
    console.log('[EOD] ClickUp not configured — skipping');
    return { sent: 0, errors: ['ClickUp not configured'] };
  }

  const todayStartMs = todayStart();

  const memberData: Array<{
    member: typeof TEAM_MEMBERS[0];
    completed: ClickUpTask[];
    openTasks: ClickUpTask[];
  }> = [];

  for (const member of TEAM_MEMBERS) {
    try {
      const [completedTasks, openTasks] = await Promise.all([
        fetchTasks(member.clickupId, ['complete', 'closed'], true, todayStartMs),
        fetchTasks(member.clickupId, ['open', 'in progress', 'to do', 'in review']),
      ]);
      memberData.push({ member, completed: completedTasks, openTasks });
    } catch (e) {
      console.error(`[EOD] fetch failed for ${member.name}:`, e);
      errors.push(`fetch failed for ${member.name}`);
      memberData.push({ member, completed: [], openTasks: [] });
    }
    await delay(300);
  }

  const jatinData = memberData.find(m => m.member.clickupId === '88911769');
  const otherMembers = memberData.filter(m => m.member.clickupId !== '88911769');
  const orderedMembers = jatinData ? [jatinData, ...otherMembers] : otherMembers;

  let sent = 0;

  for (const md of orderedMembers) {
    const { member, completed, openTasks } = md;

    try {
      let msg = '';

      // Jatin gets team summary
      if (member.clickupId === '88911769') {
        const totalCompleted = memberData.reduce((s, m) => s + m.completed.length, 0);
        const totalOpen = memberData.reduce((s, m) => s + m.openTasks.length, 0);
        msg += `📊 *EOD Team Summary*\n`;
        msg += `Completed today: *${totalCompleted}* · Open: *${totalOpen}*\n\n`;
        for (const om of otherMembers) {
          msg += `${om.member.name}: ${om.completed.length} done, ${om.openTasks.length} open\n`;
        }
        msg += `\n---\n\n`;
      }

      if (completed.length === 0) {
        msg += `📝 EOD — ${member.name}\n`;
        msg += `No tasks marked complete today.\n`;
        msg += `Open tasks: ${openTasks.length}\n`;
        msg += `Remember to update ClickUp as you complete work!`;
      } else {
        msg += `✅ *EOD Summary — ${member.name}*\n`;
        msg += `*Completed today (${completed.length}):*\n`;
        msg += formatTaskList(completed, 'completed') + '\n';

        if (openTasks.length > 0) {
          msg += `*Still open (${openTasks.length}):*\n`;
          msg += formatTaskList(openTasks, 'open') + '\n';
        }

        msg += `\n${completed.length} done · ${openTasks.length} carry forward · Great work today!`;
      }

      // Send as personal DM
      const ok = await sendSlackDM(member.slackId, msg);
      if (ok) {
        sent++;
        console.log(`[EOD] DM sent to ${member.name}`);
      } else {
        errors.push(`DM failed for ${member.name} (${member.slackId})`);
        console.error(`[EOD] DM failed for ${member.name}`);
      }
    } catch (e) {
      errors.push(`error for ${member.name}: ${e instanceof Error ? e.message : String(e)}`);
      console.error(`[EOD] error for ${member.name}:`, e);
    }

    await delay(2000);
  }

  console.log(`[EOD] summary complete — sent: ${sent}/${memberData.length}, errors: ${errors.length}`);
  return { sent, errors };
}
