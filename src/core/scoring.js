export function computeRecencyBoost(lastUsedRank) {
  if (!lastUsedRank) return 0;
  return lastUsedRank * 0.01;
}
