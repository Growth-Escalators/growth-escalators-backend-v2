/**
 * Deterministic signal scorer — pure TypeScript, $0 LLM cost.
 *
 * Implements PRD §5.1 rubric exactly:
 *   - Days open 30+:  +3
 *   - Days open 14-29: +2
 *   - Reposted:       +3
 *   - Volume 4+:      +2 | 2-3: +1
 *   - Contract keywords: +2
 *   - LCA sponsor 5+: +1
 *
 * No network calls. Fully unit-testable.
 */

interface SignalInput {
  daysOpen: number;
  repostCount: number;
  companyVolumeCount: number;
  employmentType: string | null;
  keywords: string[] | null;
  h1bSponsorCount: number;
}

export interface ScoreResult {
  score: number;
  breakdown: {
    daysOpen: 0 | 2 | 3;
    repost: 0 | 3;
    volume: 0 | 1 | 2;
    keywords: 0 | 2;
    lca: 0 | 1;
  };
  reasoning: string;
}

// Keywords that signal contract/staffing opportunity
const CONTRACT_KEYWORDS = [
  'w2', 'c2c', 'corp-to-corp', 'contract', 'contract-to-hire', '6-month',
  '6 month', '12-month', 'contractor', '1099', 'temp', 'temporary',
];

export function scoreSignal(input: SignalInput): ScoreResult {
  const breakdown: ScoreResult['breakdown'] = {
    daysOpen: 0,
    repost: 0,
    volume: 0,
    keywords: 0,
    lca: 0,
  };

  // Days open
  if (input.daysOpen >= 30) breakdown.daysOpen = 3;
  else if (input.daysOpen >= 14) breakdown.daysOpen = 2;

  // Repost
  if (input.repostCount > 0) breakdown.repost = 3;

  // Volume
  if (input.companyVolumeCount >= 4) breakdown.volume = 2;
  else if (input.companyVolumeCount >= 2) breakdown.volume = 1;

  // Contract keywords — check employment type + keywords array
  const allText = [
    input.employmentType ?? '',
    ...(input.keywords ?? []),
  ].join(' ').toLowerCase();

  if (CONTRACT_KEYWORDS.some((kw) => allText.includes(kw))) {
    breakdown.keywords = 2;
  }

  // LCA sponsor count
  if (input.h1bSponsorCount >= 5) breakdown.lca = 1;

  const score = Math.min(
    10,
    breakdown.daysOpen + breakdown.repost + breakdown.volume + breakdown.keywords + breakdown.lca,
  );

  // Build reasoning
  const reasons: string[] = [];
  if (breakdown.daysOpen === 3) reasons.push(`open ${input.daysOpen}d (stale)`);
  else if (breakdown.daysOpen === 2) reasons.push(`open ${input.daysOpen}d`);
  if (breakdown.repost === 3) reasons.push(`reposted ${input.repostCount}x`);
  if (breakdown.volume === 2) reasons.push(`${input.companyVolumeCount} similar roles (high volume)`);
  else if (breakdown.volume === 1) reasons.push(`${input.companyVolumeCount} similar roles`);
  if (breakdown.keywords === 2) reasons.push('contract keywords');
  if (breakdown.lca === 1) reasons.push(`H-1B sponsor (${input.h1bSponsorCount} LCAs)`);
  const reasoning = reasons.length > 0 ? reasons.join(', ') : 'low priority signal';

  return { score, breakdown, reasoning };
}