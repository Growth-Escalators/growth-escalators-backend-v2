import { db, socialPosts } from '../db/index';
import { eq, and, lte, sql } from 'drizzle-orm';
import { publishSocialPost } from '../routes/social';

let running = false;

export async function processDueSocialPosts(): Promise<void> {
  const due = await db.select().from(socialPosts).where(
    and(
      eq(socialPosts.status, 'scheduled'),
      lte(socialPosts.scheduledAt, new Date())
    )
  ).limit(20);

  for (const post of due) {
    try {
      await publishSocialPost(post.id);
      console.log(`[social-worker] published post ${post.id}`);
    } catch (e) {
      console.error(`[social-worker] failed to publish post ${post.id}:`, e);
      await db.update(socialPosts)
        .set({ status: 'failed', errorMessage: String(e) })
        .where(eq(socialPosts.id, post.id));
    }
  }
}

export function startSocialPostWorker(): void {
  if (running) return;
  running = true;
  // Check every 60 seconds
  setInterval(() => {
    processDueSocialPosts().catch(e => console.error('[social-worker] error:', e));
  }, 60_000);
  console.log('[social-worker] started — checking every 60s for due posts');
}
