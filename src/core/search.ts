import { computeRecencyBoost, MatchStrength } from "./scoring";
import type { PromptId, PromptRecord, SearchResult } from "./types";

const PROMPTS: PromptRecord[] = [
  {
    id: "general-helper",
    title: "General helper",
    body: "You are a concise, helpful assistant.",
    tags: ["general"],
    pinned: true,
    createdAt: 1,
    updatedAt: 1,
    lastUsedAt: 1,
  },
  {
    id: "summarize",
    title: "Summarize text",
    body: "Summarize the following content in bullet points:",
    tags: ["summary"],
    pinned: false,
    createdAt: 2,
    updatedAt: 2,
    lastUsedAt: 2,
  },
  {
    id: "bug-report",
    title: "Bug report",
    body: "Steps to reproduce:\nExpected:\nActual:",
    tags: ["template", "bug"],
    pinned: false,
    createdAt: 3,
    updatedAt: 3,
    lastUsedAt: 3,
  },
];

const lastUsed = new Map<PromptId, number>();
let usageCounter = Math.max(...PROMPTS.map((p) => p.lastUsedAt ?? 0));
for (const prompt of PROMPTS) {
  if (prompt.lastUsedAt !== undefined) {
    lastUsed.set(prompt.id, prompt.lastUsedAt);
  }
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function classifyMatch(query: string, prompt: PromptRecord): { strength: MatchStrength; signal: number } {
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

function strengthWeight(strength: MatchStrength): number {
  switch (strength) {
    case "exact-substring":
      return 3;
    case "token":
      return 2;
    case "weak":
    default:
      return 1;
  }
}

export function searchPrompts(query: string, limit: number): SearchResult[] {
  const normalized = normalizeQuery(query);
  const results: SearchResult[] = PROMPTS.map((prompt) => {
    const { strength, signal } = classifyMatch(normalized, prompt);
    const recencyBoost = computeRecencyBoost(lastUsed.get(prompt.id) ?? prompt.lastUsedAt);
    const pinned = Boolean(prompt.pinned);
    const matchWeight = strengthWeight(strength);
    const score = matchWeight + recencyBoost + (pinned ? 0.1 : 0);

    return {
      id: prompt.id,
      title: prompt.title ?? prompt.body.slice(0, 32),
      snippet: prompt.body.slice(0, 120),
      body: prompt.body,
      tags: prompt.tags,
      pinned,
      score,
      sim: signal,
      recencyBoost,
      pinBoost: pinned ? 0.1 : 0,
    };
  });

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // prefer pinned when scores tie
    if (a.pinned !== b.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    // prefer higher recency
    if ((b.recencyBoost ?? 0) !== (a.recencyBoost ?? 0)) return (b.recencyBoost ?? 0) - (a.recencyBoost ?? 0);
    // stable fallback by id
    return a.id.localeCompare(b.id);
  });

  return results.slice(0, limit);
}

export function recordUsage(promptId: PromptId): void {
  usageCounter += 1;
  lastUsed.set(promptId, usageCounter);
}

export function listPrompts(): PromptRecord[] {
  return [...PROMPTS];
}
