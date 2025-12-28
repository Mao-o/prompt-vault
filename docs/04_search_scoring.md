# Search & Scoring (Revised)

**MVP note:** The shipping MVP uses deterministic, keyword-only scoring over a small in-memory set. Semantic/embedding and progressive behaviors described here are future-facing and deferred until they can be proven without harming UX stability.

## 현실的な目標（MVP）
Embedding dim と件数により変動するため、目標を段階化する。

### Target (single query)
- <= 500 items: UI update within ~50ms (ideal)
- <= 2000 items: UI update within ~150ms (acceptable)
- > 2000 items: progressive rendering + background compute (required)

## Progressive rendering
- First batch: compute top 100 quickly and render immediately
- Remaining: compute in batches and append/merge results
- Always keep UI responsive (vector math runs off the UI thread)

UI receives:
- SEARCH/RESULTS { isFinal: false } multiple times
- Then { isFinal: true }

## Compute placement
- Offscreen document (or Worker) handles vector math.
- UI thread never loops over vectors.

## Scoring
finalScore = sim * 0.80 + recencyBoost * 0.20 + pinBoost + siteBoost

- sim: dot product on normalized vectors (cosine)
- recencyBoost: exp(-(now-lastUsedAt)/tau), tau=14 days
- pinBoost: +0.15
- siteBoost: +0.05 when siteScoped host matches
