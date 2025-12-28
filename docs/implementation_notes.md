# Implementation Notes

## IndexedDB Storage Layer (src/core/storage.ts)

**Database:** `prompt_vault_db` (version 1)

**Stores:**
- `prompts` - stores PromptRecord objects, indexed by id, updatedAt, pinned, title, tags
- `embeddings` - stores normalized Float32Array vectors as ArrayBuffer, keyed by prompt id
- `usage` - tracks usage events (promptId, usedAt, action), auto-increment key
- `settings` - key-value store for app settings

**Seeding:**
- On first run (when `prompts` is empty), three default prompts are seeded to avoid an empty UX.

**Promise API:**
- `listPrompts()` → `Promise<PromptRecord[]>`
- `upsertPrompt(prompt)` → `Promise<void>`
- `deletePrompt(id)` → `Promise<void>` (cascades to embeddings)
- `getEmbedding(id)` → `Promise<EmbeddingRecord | undefined>`
- `getEmbeddings()` → `Promise<EmbeddingRecord[]>`
- `putEmbedding(id, vector, model)` → `Promise<void>` (auto-normalizes)
- `recordUsage(promptId, action)` → `Promise<void>`
- `getUsageStats(promptId?)` → `Promise<UsageStats[]>`
- `getSetting<T>(key)` → `Promise<T | undefined>`
- `setSetting(key, value)` → `Promise<void>`
- `dotProduct(a, b)` → `number` (for cosine similarity of normalized vectors)

**Key features:**
- Vectors normalized to unit length at write-time for fast dot product = cosine similarity
- Efficient ArrayBuffer storage for Float32Array embeddings
- Cascade delete: deleting a prompt also deletes its embedding
- Usage stats aggregated from raw usage events

## Search & Scoring (src/core/search.ts, src/core/scoring.ts)

**Search API:**
```typescript
searchPrompts(query: string, limit: number, options?: SearchOptions): Promise<SearchResult[]>
```

**SearchOptions:**
- `queryEmbedding?: Float32Array` - if provided, uses semantic search; otherwise keyword fallback
- `currentSite?: string` - for future site-scoped boost (placeholder)

**Scoring formula:**
```
finalScore = sim × 0.8 + recencyBoost × 0.2 + pinBoost + siteBoost
```

**Components:**
- `sim` - similarity (0-1): dot product for semantic, keyword match strength for fallback
- `recencyBoost` - `exp(-(now - lastUsedAt) / tau)` where tau = 14 days
- `pinBoost` - +0.15 for pinned prompts
- `siteBoost` - +0.05 for site-scoped match (future feature, currently 0)

**Keyword fallback:**
- Exact substring match → signal = 1.0
- Token overlap → signal = hits / totalTokens
- Weak/no match → signal = 0.0001

**Performance:**
- Parallel loading: prompts, usage stats, embeddings
- In-memory scoring over full dataset (brute-force)
- Logged elapsed time for monitoring

## Message Handlers (src/background/service_worker.ts)

**SEARCH/REQUEST:**
- Receives: `{ type: "SEARCH/REQUEST", requestId, query, limit }`
- Calls: `searchPrompts(query, limit)`
- Responds: `SEARCH/RESULTS` with results array and elapsedMs, or `SEARCH/ERROR`

**ACTION/EXECUTE:**
- Receives: `{ type: "ACTION/EXECUTE", requestId, promptId, renderedText, mode }`
- Forwards the same message to the active tab’s content script.
- Content script performs insert-or-copy; replies with `{ ok: boolean }` and emits `ACTION/RESULT`.
- Background records usage **only when content script reports ok** (prevents double-count).
- Clipboard is handled in the content script (service worker does not write to clipboard).

**DIAG/PING:**
- Simple health check, responds with `DIAG/PONG` from "background"

**Error handling:**
- All errors wrapped in `AppError` type with code, message, detail, recoverable fields
- Common codes: `UNKNOWN`, `NO_ACTIVE_EDITABLE`, `CONTENT_INSERT_FAILED`

## Tests (src/core/*.test.ts)

**scoring.test.ts:**
- Validates recency boost formula (exponential decay, tau=14 days)
- Validates final score computation with all boost components
- Validates constant values (PIN_BOOST=0.15, SITE_BOOST=0.05)

**storage.test.ts:**
- Tests CRUD operations for prompts, embeddings, usage, settings
- Validates vector normalization (unit norm)
- Validates dot product correctness
- Validates cascade delete (prompt → embedding)
- Validates usage stats aggregation

**Running tests:**
- Browser environment required (IndexedDB dependency)
- Import and call `runScoringTests()` or `runStorageTests()`
- See test files for usage examples

## Notes

- **MVP status:** Semantic search requires embeddings to be generated separately; not yet integrated with embedding provider
- **Performance target:** < 50ms for ~500 items, < 150ms for ~2000 items
- **Future:** Progressive rendering for > 2000 items (not yet implemented)
- **Future:** Offscreen document for heavy vector math (currently runs in background)
- **Future:** Site-scoped boost when domain rules are implemented
