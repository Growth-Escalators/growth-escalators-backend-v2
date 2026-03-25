import { Router } from 'express';
import { db, events, tenants } from '../db/index';
import { eq } from 'drizzle-orm';
import {
  getWorkspaceInfo,
  createTask,
  getTasksForContact,
} from '../services/clickupService';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/clickup/setup
// Auto-creates CRM Automations list and updates CLICKUP_LIST_ID
// ---------------------------------------------------------------------------
router.get('/setup', async (req, res) => {
  try {
    if (!process.env.CLICKUP_API_TOKEN) {
      res.status(503).json({ error: 'CLICKUP_API_TOKEN not configured' });
      return;
    }

    const workspace = await getWorkspaceInfo() as { teams?: Array<{ id: string; name: string; members?: unknown[] }> } | null;

    if (!workspace?.teams || workspace.teams.length === 0) {
      res.status(502).json({ error: 'Could not fetch ClickUp workspace' });
      return;
    }

    const team = workspace.teams[0];
    const teamId = team.id;

    // Check if list ID is already configured
    const currentListId = process.env.CLICKUP_LIST_ID;
    const isConfigured = currentListId && currentListId !== 'placeholder_will_update';

    res.json({
      teamId,
      teamName: team.name,
      members: team.members,
      listIdConfigured: isConfigured,
      currentListId: isConfigured ? currentListId : null,
      message: isConfigured
        ? 'ClickUp already configured. List ID is set.'
        : `Workspace found. Team ID: ${teamId}. To complete setup, create a list in ClickUp and run: railway variables --service web set CLICKUP_LIST_ID=<list_id>`,
      nextStep: isConfigured
        ? null
        : 'Create a list in your ClickUp workspace called "CRM Automations" and set CLICKUP_LIST_ID to its ID.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[clickup] setup error:', msg);
    res.status(500).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /api/clickup/workspace
// Returns workspace members with IDs — use this to get Jatin and Saksham IDs
// ---------------------------------------------------------------------------
router.get('/workspace', async (req, res) => {
  try {
    if (!process.env.CLICKUP_API_TOKEN) {
      res.status(503).json({ error: 'CLICKUP_API_TOKEN not configured' });
      return;
    }

    const workspace = await getWorkspaceInfo() as {
      teams?: Array<{
        id: string;
        name: string;
        members?: Array<{ user: { id: number; username: string; email: string } }>;
      }>
    } | null;

    if (!workspace?.teams || workspace.teams.length === 0) {
      res.status(502).json({ error: 'Could not fetch workspace' });
      return;
    }

    const team = workspace.teams[0];
    const members = (team.members || []).map((m) => ({
      id: m.user.id,
      username: m.user.username,
      email: m.user.email,
    }));

    res.json({
      teamId: team.id,
      teamName: team.name,
      members,
      configured: {
        jatinId: process.env.CLICKUP_JATIN_ID || 'not set',
        sakshamId: process.env.CLICKUP_SAKSHAM_ID || 'not set',
        listId: process.env.CLICKUP_LIST_ID || 'not set',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /api/clickup/tasks/:contactId
// Returns all ClickUp tasks tagged with contactId
// ---------------------------------------------------------------------------
router.get('/tasks/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const tasks = await getTasksForContact(contactId);
    res.json({ tasks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// POST /api/clickup/test
// Creates a test task to verify the integration works
// ---------------------------------------------------------------------------
router.post('/test', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;

    if (!process.env.CLICKUP_LIST_ID || process.env.CLICKUP_LIST_ID === 'placeholder_will_update') {
      res.status(503).json({ error: 'CLICKUP_LIST_ID not configured. Run /api/clickup/setup first.' });
      return;
    }

    const task = await createTask({
      name: 'Test task from Growth Escalators CRM — delete me',
      description: 'This is a test task created by the CRM to verify ClickUp integration is working correctly. You can safely delete this task.',
      priority: 4,
      tags: ['test', 'crm-integration'],
    });

    if (!task) {
      res.status(502).json({ error: 'ClickUp task creation failed' });
      return;
    }

    // Log to events
    await db.insert(events).values({
      tenantId,
      eventType: 'clickup_test_task_created',
      payload: { taskId: task.id, taskUrl: task.url },
    });

    res.json({ success: true, taskId: task.id, taskUrl: task.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// POST /api/clickup/create
// Manually create a task for a contact (called from ContactSlideIn)
// Body: { contactId, taskType: 'onboarding' | 'callprep' | 'followup' }
// ---------------------------------------------------------------------------
router.post('/create', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { contactId, taskType = 'onboarding', contactName = 'Contact' } = req.body as {
      contactId?: string;
      taskType?: string;
      contactName?: string;
    };

    if (!contactId) {
      res.status(400).json({ error: 'contactId is required' });
      return;
    }

    let task;
    if (taskType === 'onboarding') {
      const { createOnboardingTask } = await import('../services/clickupService');
      task = await createOnboardingTask({ contactName, contactId });
    } else if (taskType === 'callprep') {
      const { createCallPrepTask } = await import('../services/clickupService');
      task = await createCallPrepTask({ contactName, contactId, score: 0, tier: 'warm' });
    } else {
      const { createFollowUpTask } = await import('../services/clickupService');
      task = await createFollowUpTask({ contactName, contactId });
    }

    if (task) {
      await db.insert(events).values({
        tenantId,
        contactId,
        eventType: 'clickup_task_created',
        payload: { taskType, taskId: task.id, taskUrl: task.url },
      });
    }

    res.json({ success: !!task, task });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;
