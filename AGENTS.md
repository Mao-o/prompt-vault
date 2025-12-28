# AGENTS.md

## Goal
Build a Chrome Extension (MV3) that manages frequently used prompts with a "perfect UX":
- Command Palette (Cmd+K / Ctrl+K)
- Semantic search (vector search) done fully in-browser
- IndexedDB persistence
- Fast response time (sub-100ms feel for typical libraries)
- Safe-by-default (no prompt content leaves device unless user explicitly enables remote embedding)

## Non-goals
- Server-side search, server-side storage
- Always-on telemetry
- User tracking

## Core user flows
1) Open palette (Cmd+K) anywhere
2) Type query -> instant results
3) Select prompt -> insert into active input/textarea OR copy to clipboard
4) Manage prompts (create/edit/tag/pin)
5) Optional: variables like {{name}}, with quick fill UI

## Architecture summary
MV3:
- background/service_worker: orchestration, hotkeys, opening UI, message routing
- offscreen document: heavy compute (embedding generation if local, large vector math) and optional model loading
- content script: DOM insertion & active element detection
- UI: command palette (popup-like overlay) rendered as extension page

## Search strategy
Phase 1 (default): exact brute-force dot product over normalized embeddings + lightweight ranking (semantic + recency + pin)
Phase 2 (optional): HNSW index if library grows (10k+)

## Storage
IndexedDB:
- prompts store
- embeddings store (Float32Array)
- usage events store (for recency/usage_count)
- settings store (embedding provider, hotkey, insertion mode)

## Embedding provider interface
Support multiple providers behind a stable interface:
- "none": keyword-only or title/tags
- "remote": user config for API (OpenAI/others) - OFF by default
- "local": optional later (WebGPU/transformers.js) - behind feature flag

## Performance constraints
- Search call returns top-K in < 50ms for ~2k items on typical machines
- UI update in < 16ms per keystroke where possible
- Vector math runs in Worker/offscreen to avoid UI jank

## Safety/Privacy constraints
- Never transmit prompt content without explicit opt-in
- Never inject into passwords fields or sensitive contexts by default
- Provide a "safe insert" that only copies unless user toggles direct insert
- Sanitization when inserting into DOM

## Deliverables
- Fully working MV3 extension
- Documentation & tests for core ranking/search
- Build scripts (optional) and clear "load unpacked" instructions

## Coding style
- TypeScript, strict
- Small pure functions in core/
- Message passing typed with discriminated unions
- No heavy framework required; keep dependencies minimal
