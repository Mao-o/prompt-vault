export type MatchStrength = "exact-substring" | "token" | "weak";

export function computeRecencyBoost(lastUsedRank?: number): number {
  // Deterministic, non-time-based bump that keeps ordering stable between opens.
  if (!lastUsedRank) return 0;
  return lastUsedRank * 0.01;
}
