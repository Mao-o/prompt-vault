import { computeRecencyBoost, computeFinalScore, type MatchStrength } from "./scoring";
import type { InsertMode, PromptId, PromptRecord, SearchResult } from "./types";
import {
  listPrompts,
  getEmbeddings,
  getUsageStats,
  dotProduct,
  recordUsage as persistUsage,
  type EmbeddingRecord,
} from "./storage";

export interface SearchOptions {
  /**
   * Optional: query embedding for semantic search
   * If provided, semantic scoring will be used instead of keyword matching
   */
  queryEmbedding?: Float32Array;

  /**
   * Optional: current site hostname for site-scoped boost
   */
  currentSite?: string;
}

/**
 * Main search function supporting both keyword and semantic search
 * @param query - search query string
 * @param limit - max number of results to return
 * @param options - optional search options (embedding, site scope)
 */
export async function searchPrompts(
  query: string,
  limit: number,
  options?: SearchOptions
): Promise<SearchResult[]> {
  const startTime = performance.now();

  // Load data in parallel
  const [prompts, usageStats, embeddings] = await Promise.all([
    listPrompts(),
    getUsageStats(),
    options?.queryEmbedding ? getEmbeddings() : Promise.resolve([]),
  ]);

  // Build usage map for quick lookup
  const usageMap = new Map<PromptId, { lastUsedAt: number; count: number }>();
  for (const stat of usageStats) {
    usageMap.set(stat.promptId, { lastUsedAt: stat.lastUsedAt, count: stat.count });
  }

  // Build embedding map for semantic search
  const embeddingMap = new Map<PromptId, Float32Array>();
  for (const emb of embeddings) {
    embeddingMap.set(emb.id, new Float32Array(emb.vector));
  }

  const normalized = normalizeQuery(query);
  const results: SearchResult[] = [];

  for (const prompt of prompts) {
    const usage = usageMap.get(prompt.id);
    const lastUsedAt = usage?.lastUsedAt ?? prompt.lastUsedAt;
    const recencyBoost = computeRecencyBoost(lastUsedAt);
    const pinned = Boolean(prompt.pinned);

    let sim = 0;
    let simDebug = 0;

    // Determine similarity score: semantic if embedding available, else keyword
    if (options?.queryEmbedding && embeddingMap.has(prompt.id)) {
      // Semantic search: dot product of normalized vectors = cosine similarity
      const promptEmbedding = embeddingMap.get(prompt.id)!;
      sim = dotProduct(options.queryEmbedding, promptEmbedding);
      simDebug = sim;
    } else {
      // Keyword search fallback
      const { strength, signal } = classifyMatch(normalized, prompt);
      sim = signal;
      simDebug = signal;
    }

    // Check site match (not implemented in MVP, placeholder for future)
    const siteMatch = false; // TODO: implement domain rules matching

    const score = computeFinalScore(sim, recencyBoost, pinned, siteMatch);

    results.push({
      id: prompt.id,
      title: prompt.title ?? prompt.body.slice(0, 32),
      snippet: prompt.body.slice(0, 120),
      body: prompt.body,
      tags: prompt.tags,
      pinned,
      score,
      sim: simDebug,
      recencyBoost,
      pinBoost: pinned ? 0.15 : 0,
      siteBoost: siteMatch ? 0.05 : 0,
    });
  }

  // Sort by score (descending), then by tiebreakers
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // prefer pinned when scores tie
    if (a.pinned !== b.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    // prefer higher recency
    if ((b.recencyBoost ?? 0) !== (a.recencyBoost ?? 0))
      return (b.recencyBoost ?? 0) - (a.recencyBoost ?? 0);
    // stable fallback by id
    return a.id.localeCompare(b.id);
  });

  const elapsedMs = performance.now() - startTime;
  console.log(`[search] ${results.length} results in ${elapsedMs.toFixed(2)}ms`);

  return results.slice(0, limit);
}

export function recordUsage(promptId: PromptId, action: InsertMode = "insert"): Promise<void> {
  return persistUsage(promptId, action);
}

// ============================================================================
// KEYWORD MATCHING (fallback when no embeddings)
// ============================================================================

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function classifyMatch(
  query: string,
  prompt: PromptRecord
): { strength: MatchStrength; signal: number } {
  if (!query) return { strength: "weak", signal: 0.0001 };

  const q = normalizeQuery(query);
  const haystack = `${prompt.title ?? ""} ${prompt.tags.join(" ")} ${prompt.body}`.toLowerCase();

  if (haystack.includes(q)) return { strength: "exact-substring", signal: 1 };

  const qTokens = new Set(tokenize(q));
  const hTokens = tokenize(haystack);
  if (!hTokens.length || !qTokens.size) return { strength: "weak", signal: 0.0001 };

  let hits = 0;
  for (const t of hTokens) {
    if (qTokens.has(t)) hits += 1;
  }

  if (hits > 0) {
    return { strength: "token", signal: hits / hTokens.length };
  }

  return { strength: "weak", signal: 0.0001 };
}
