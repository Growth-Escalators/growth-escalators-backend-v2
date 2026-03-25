import https from 'https';

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID;

interface ClickUpTask {
  name: string;
  description?: string;
  assignees?: number[];
  tags?: string[];
  status?: string;
  priority?: number;
  dueDate?: number;
  customFields?: Array<{ id: string; value: unknown }>;
}

async function clickupRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  if (!CLICKUP_TOKEN) {
    console.error('[ClickUp] CLICKUP_API_TOKEN not set');
    return null;
  }

  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.clickup.com',
      path: `/api/v2${path}`,
      method,
      headers: {
        Authorization: CLICKUP_TOKEN,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error('[ClickUp] request error:', e.message);
      resolve(null);
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export async function getWorkspaceInfo(): Promise<unknown> {
  return clickupRequest('GET', '/team');
}

export async function createTask(task: ClickUpTask): Promise<{ id: string; url: string } | null> {
  const listId = CLICKUP_LIST_ID;
  if (!listId || listId === 'placeholder_will_update') {
    console.log('[ClickUp] list ID not configured yet — task skipped:', task.name);
    return null;
  }

  const payload: Record<string, unknown> = {
    name: task.name,
    priority: task.priority || 2,
    notify_all: false,
  };

  if (task.description) payload.description = task.description;
  if (task.assignees && task.assignees.length > 0) payload.assignees = task.assignees;
  if (task.tags && task.tags.length > 0) payload.tags = task.tags;
  if (task.status) payload.status = task.status;
  if (task.dueDate) payload.due_date = task.dueDate;

  const result = await clickupRequest('POST', `/list/${listId}/task`, payload) as { id?: string; url?: string } | null;

  if (result && result.id) {
    console.log(`[ClickUp] task created: ${task.name} — ID: ${result.id}`);
    return { id: result.id, url: result.url ?? '' };
  }

  console.error('[ClickUp] task creation failed:', result);
  return null;
}

export async function getTasksForContact(contactId: string): Promise<unknown[]> {
  const listId = CLICKUP_LIST_ID;
  if (!listId || listId === 'placeholder_will_update') return [];

  const result = await clickupRequest('GET', `/list/${listId}/task?tags[]=${contactId}&include_closed=true`) as { tasks?: unknown[] } | null;
  return result?.tasks || [];
}

export async function updateTaskStatus(taskId: string, status: string): Promise<boolean> {
  const result = await clickupRequest('PUT', `/task/${taskId}`, { status }) as { id?: string } | null;
  return !!(result?.id);
}

function daysFromNow(days: number): number {
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

function getAssigneeId(person: 'jatin' | 'saksham'): number[] {
  const id = person === 'jatin'
    ? process.env.CLICKUP_JATIN_ID
    : process.env.CLICKUP_SAKSHAM_ID;

  if (!id || id === 'placeholder_will_update') return [];
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? [] : [parsed];
}

export async function createOnboardingTask(params: {
  contactName: string;
  contactId: string;
  dealValue?: number;
  contactEmail?: string;
  contactPhone?: string;
  pipelineName?: string;
}): Promise<{ id: string; url: string } | null> {
  const valueStr = params.dealValue ? ` — ₹${params.dealValue.toLocaleString('en-IN')}/mo` : '';

  return createTask({
    name: `Onboard ${params.contactName}${valueStr}`,
    description: `New client onboarding task auto-created from CRM.\n\nClient: ${params.contactName}\nEmail: ${params.contactEmail || 'N/A'}\nPhone: ${params.contactPhone || 'N/A'}\nDeal value: ${params.dealValue ? '₹' + params.dealValue.toLocaleString('en-IN') + '/month' : 'Not set'}\nPipeline: ${params.pipelineName || 'D2C Prospects'}\nContact ID: ${params.contactId}\n\nCRM link: https://web-production-311da.up.railway.app/crm (search for ${params.contactName})`,
    assignees: getAssigneeId('jatin'),
    tags: [params.contactId, 'new-client', 'onboarding'],
    priority: 1,
    dueDate: daysFromNow(3),
    status: 'to do',
  });
}

export async function createCallPrepTask(params: {
  contactName: string;
  contactId: string;
  score: number;
  tier: string;
  adSpend?: string;
  isDecisionMaker?: boolean;
  scheduledAt?: string;
  assignedTo?: 'jatin' | 'saksham';
}): Promise<{ id: string; url: string } | null> {
  const dueTime = params.scheduledAt
    ? new Date(params.scheduledAt).getTime() - 60 * 60 * 1000
    : daysFromNow(1);

  return createTask({
    name: `Call prep — ${params.contactName} — ${params.score}/100 ${params.tier}`,
    description: `Strategy call booked. Auto-created from CRM.\n\nLead: ${params.contactName}\nScore: ${params.score}/100 (${params.tier.toUpperCase()})\nAd spend: ${params.adSpend || 'Not specified'}\nDecision maker: ${params.isDecisionMaker ? 'Yes' : 'No/Unknown'}\nCall time: ${params.scheduledAt || 'Check calendar'}\nContact ID: ${params.contactId}\n\nCRM link: https://web-production-311da.up.railway.app/crm (search for ${params.contactName})`,
    assignees: getAssigneeId(params.assignedTo || 'jatin'),
    tags: [params.contactId, 'strategy-call', params.tier + '-lead'],
    priority: params.tier === 'hot' ? 1 : 2,
    dueDate: dueTime,
    status: 'to do',
  });
}

export async function createFollowUpTask(params: {
  contactName: string;
  contactId: string;
  dealValue?: number;
  proposalDate?: string;
  assignedTo?: 'jatin' | 'saksham';
}): Promise<{ id: string; url: string } | null> {
  return createTask({
    name: `Follow up on proposal — ${params.contactName}`,
    description: `Proposal sent. Follow up required.\n\nClient: ${params.contactName}\nProposal date: ${params.proposalDate || new Date().toLocaleDateString('en-IN')}\nDeal value: ${params.dealValue ? '₹' + params.dealValue.toLocaleString('en-IN') + '/month' : 'Not set'}\nContact ID: ${params.contactId}\n\nCRM link: https://web-production-311da.up.railway.app/crm (search for ${params.contactName})`,
    assignees: getAssigneeId(params.assignedTo || 'saksham'),
    tags: [params.contactId, 'proposal', 'follow-up'],
    priority: 2,
    dueDate: daysFromNow(2),
    status: 'to do',
  });
}

export async function createLostDealAnalysisTask(params: {
  contactName: string;
  contactId: string;
  lostReason: string;
  dealValue?: number;
}): Promise<{ id: string; url: string } | null> {
  return createTask({
    name: `Lost deal analysis — ${params.contactName} — ${params.lostReason}`,
    description: `Deal lost. Analysis task auto-created.\n\nClient: ${params.contactName}\nLost reason: ${params.lostReason}\nDeal value: ${params.dealValue ? '₹' + params.dealValue.toLocaleString('en-IN') + '/month' : 'Not set'}\nContact ID: ${params.contactId}\n\nReview this lead. Could they be re-engaged in 90 days?`,
    assignees: getAssigneeId('jatin'),
    tags: [params.contactId, 'lost-deal', 'analysis'],
    priority: 4,
    dueDate: daysFromNow(7),
    status: 'to do',
  });
}
