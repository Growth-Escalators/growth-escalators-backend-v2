import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VisibilityBreakdown {
  schema: number;
  faq: number;
  firstSentence: number;
  depth: number;
  freshness: number;
}

interface VisibilityResult {
  score: number;
  breakdown: VisibilityBreakdown;
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Analyze AI visibility for a page
// ---------------------------------------------------------------------------
export async function analyzeAIVisibility(pageUrl: string): Promise<VisibilityResult | null> {
  try {
    const res = await fetch(pageUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'GrowthEscalators-AIVisibility/1.0' },
    });

    if (!res.ok) {
      logger.warn(`[ai-visibility] Failed to fetch ${pageUrl}: ${res.status}`);
      return null;
    }

    const html = await res.text();
    const breakdown: VisibilityBreakdown = {
      schema: scoreSchema(html),
      faq: scoreFaq(html),
      firstSentence: scoreFirstSentence(html, pageUrl),
      depth: scoreDepth(html),
      freshness: scoreFreshness(html),
    };

    const score = breakdown.schema + breakdown.faq + breakdown.firstSentence + breakdown.depth + breakdown.freshness;
    const recommendations = getAIVisibilityRecommendations(score, breakdown);

    logger.info(`[ai-visibility] ${pageUrl} — score ${score}/100`);
    return { score, breakdown, recommendations };
  } catch (e) {
    logger.error(`[ai-visibility] Analysis failed for ${pageUrl}:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ---------------------------------------------------------------------------
// Scoring functions (each 0-20)
// ---------------------------------------------------------------------------

function scoreSchema(html: string): number {
  const hasJsonLd = html.includes('application/ld+json');
  if (!hasJsonLd) return 0;

  // Count distinct schema types
  const matches = html.match(/application\/ld\+json/g) ?? [];
  if (matches.length >= 3) return 20;
  if (matches.length >= 2) return 15;
  return 10;
}

function scoreFaq(html: string): number {
  const htmlLower = html.toLowerCase();
  const hasFaqHeading = /(<h[2-3][^>]*>.*?faq|frequently asked)/i.test(html);
  const hasQuestionSchema = htmlLower.includes('itemtype') && htmlLower.includes('question');
  const hasQaPairs = (html.match(/<h[2-4][^>]*>.*?\?<\/h[2-4]>/gi) ?? []).length;

  if (hasQuestionSchema && hasFaqHeading) return 20;
  if (hasFaqHeading && hasQaPairs >= 3) return 15;
  if (hasFaqHeading || hasQaPairs >= 2) return 10;
  if (hasQaPairs >= 1) return 5;
  return 0;
}

function scoreFirstSentence(html: string, pageUrl: string): number {
  // Extract first <p> text
  const pMatch = html.match(/<p[^>]*>(.*?)<\/p>/is);
  if (!pMatch) return 0;

  const firstP = pMatch[1].replace(/<[^>]+>/g, '').trim();
  if (!firstP) return 0;

  // Check length (under 150 chars is ideal for AI snippets)
  const isShort = firstP.length <= 150;

  // Extract likely keywords from URL path
  const urlPath = new URL(pageUrl).pathname.replace(/[/-]/g, ' ').trim().toLowerCase();
  const urlWords = urlPath.split(/\s+/).filter(w => w.length > 3);
  const firstPLower = firstP.toLowerCase();
  const keywordMatch = urlWords.some(w => firstPLower.includes(w));

  if (isShort && keywordMatch) return 20;
  if (isShort || keywordMatch) return 10;
  return 5;
}

function scoreDepth(html: string): number {
  // Strip HTML tags and count words in body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch?.[1] ?? html;
  const text = bodyHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wordCount = text.split(' ').filter(w => w.length > 0).length;

  if (wordCount >= 800) return 20;
  if (wordCount >= 500) return 12;
  return 5;
}

function scoreFreshness(html: string): number {
  const htmlLower = html.toLowerCase();
  let score = 0;

  // Check for dateModified in schema
  if (htmlLower.includes('datemodified')) score += 10;

  // Check for freshness text signals
  if (/last\s*(updated|modified)\s*[:—–-]/i.test(html)) score += 10;
  if (/updated\s*on\s*\d/i.test(html)) score += 10;

  return Math.min(score, 20);
}

// ---------------------------------------------------------------------------
// Get recommendations based on scores
// ---------------------------------------------------------------------------
export function getAIVisibilityRecommendations(score: number, breakdown: VisibilityBreakdown): string[] {
  const recommendations: string[] = [];

  if (breakdown.schema < 20) {
    recommendations.push('Add FAQPage + Article JSON-LD structured data');
  }
  if (breakdown.faq < 20) {
    recommendations.push('Add an FAQ section with 3-5 questions from People Also Ask');
  }
  if (breakdown.firstSentence < 20) {
    recommendations.push('Rewrite the first sentence to directly answer the search query');
  }
  if (breakdown.depth < 20) {
    recommendations.push('Expand content to 800+ words with comprehensive coverage');
  }
  if (breakdown.freshness < 20) {
    recommendations.push('Add "Last updated: [date]" and dateModified schema');
  }

  if (recommendations.length === 0) {
    recommendations.push('Page is well-optimized for AI visibility');
  }

  return recommendations;
}
