export type MatchStrength = "exact-substring" | "token" | "weak";

const TAU_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds

/**
 * Compute recency boost based on time since last use
 * Formula: exp(-(now - lastUsedAt) / tau), tau = 14 days
 */
export function computeRecencyBoost(lastUsedAt?: number): number {
  if (!lastUsedAt) return 0;
  const now = Date.now();
  const elapsed = now - lastUsedAt;
  if (elapsed < 0) return 0; // future timestamp, ignore
  return Math.exp(-elapsed / TAU_MS);
}

/**
 * Fixed boost for pinned prompts
 */
export const PIN_BOOST = 0.15;

/**
 * Fixed boost for site-scoped match
 */
export const SITE_BOOST = 0.05;

/**
 * Compute final score for a prompt
 * @param sim - similarity score (0-1, from dot product or keyword match)
 * @param recencyBoost - recency boost (0-1)
 * @param pinned - whether prompt is pinned
 * @param siteMatch - whether prompt matches current site scope
 */
export function computeFinalScore(
  sim: number,
  recencyBoost: number,
  pinned: boolean,
  siteMatch: boolean = false
): number {
  return sim * 0.8 + recencyBoost * 0.2 + (pinned ? PIN_BOOST : 0) + (siteMatch ? SITE_BOOST : 0);
}
