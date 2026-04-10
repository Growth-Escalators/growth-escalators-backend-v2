import { Router, type Request, type Response } from 'express';
import logger from '../utils/logger';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/postiz/scheduled — list scheduled posts
// ---------------------------------------------------------------------------
router.get('/scheduled', async (_req: Request, res: Response) => {
  try {
    const { getScheduledPosts } = await import('../services/postizService');
    const posts = await getScheduledPosts();
    res.json({ posts });
  } catch (e) {
    logger.error('[postiz] scheduled posts fetch failed:', e);
    const msg = e instanceof Error ? e.message : String(e);
    // Surface API key not set as actionable message
    if (msg.includes('401') || msg.includes('Unauthorized') || !process.env.POSTIZ_API_KEY || process.env.POSTIZ_API_KEY === 'REPLACE_WITH_POSTIZ_API_KEY') {
      res.status(503).json({ error: 'POSTIZ_NOT_CONFIGURED', message: 'Postiz API key not set. Go to Settings → API Keys in Postiz to generate one.' });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch scheduled posts' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/postiz/schedule — create a new scheduled post
// ---------------------------------------------------------------------------
router.post('/schedule', async (req: Request, res: Response) => {
  const { integrationId, content, publishAt } = req.body as {
    integrationId?: string;
    content?: string;
    publishAt?: string;
  };

  if (!integrationId || !content || !publishAt) {
    res.status(400).json({ error: 'integrationId, content and publishAt are required' });
    return;
  }

  try {
    const { schedulePost } = await import('../services/postizService');
    const post = await schedulePost({ integrationId, content, publishAt });
    res.json({ post });
  } catch (e) {
    logger.error('[postiz] schedule post failed:', e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('401') || msg.includes('Unauthorized') || !process.env.POSTIZ_API_KEY || process.env.POSTIZ_API_KEY === 'REPLACE_WITH_POSTIZ_API_KEY') {
      res.status(503).json({ error: 'POSTIZ_NOT_CONFIGURED', message: 'Postiz API key not set.' });
      return;
    }
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/postiz/integrations — list connected social accounts
// ---------------------------------------------------------------------------
router.get('/integrations', async (_req: Request, res: Response) => {
  try {
    const { listWorkspaces, getIntegrations } = await import('../services/postizService');
    const workspaces = await listWorkspaces();
    if (workspaces.length === 0) {
      res.json({ integrations: [] });
      return;
    }
    // Use first workspace — extend later for multi-workspace
    const integrations = await getIntegrations(workspaces[0].id);
    res.json({ integrations, workspace: workspaces[0] });
  } catch (e) {
    logger.error('[postiz] integrations fetch failed:', e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('401') || msg.includes('Unauthorized') || !process.env.POSTIZ_API_KEY || process.env.POSTIZ_API_KEY === 'REPLACE_WITH_POSTIZ_API_KEY') {
      res.status(503).json({ error: 'POSTIZ_NOT_CONFIGURED', message: 'Postiz API key not set.' });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

export default router;
