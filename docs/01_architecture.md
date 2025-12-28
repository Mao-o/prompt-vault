# Architecture

## Components
1) Background (service worker)
- Registers commands/hotkeys
- Registers content script upfront (with fallback to on-demand injection)
- Opens palette UI (extension page or side panel)
- Message routing between UI <-> offscreen <-> content script
- Maintains minimal in-memory cache (optional)

2) UI (command palette)
- Renders search box and results
- Debounced query -> requests search results
- Keeps focus pinned to the query input (iframe grabs focus on load, re-focus on blur)
- Handles selection, variable fill, and action choice (single-click executes; Enter waits briefly for in-flight search to finish)

3) Content Script
- Detects active editable element
- Inserts text safely OR triggers copy to clipboard
- Provides overlay/backdrop and close-on-outside-click/Cmd+K behavior
- Provides page context (domain) to ranking filters

4) Offscreen Document
- Hosts heavy compute:
  - embedding generation (if local)
  - dot-product scoring over many vectors
  - potential HNSW index build
- Keeps models/resources alive across palette opens (where possible)

## Message Flow (typical)
Cmd+K ->
  background opens palette ->
    UI sends SEARCH(query) ->
      offscreen computes embedding + searchTopK ->
        UI renders results ->
          user selects ->
            UI sends INSERT(promptId, renderedText) ->
              background forwards to content script ->
                content script inserts into active element

## Why Offscreen?
MV3 service workers are ephemeral; offscreen doc is a stable place to do compute and hold state.

## Data ownership
IndexedDB is the source of truth. In-memory caches are derived.

## Extension surfaces
- commands API (hotkey)
- content scripts on all_urls (with safety checks)
- optional sidePanel API (if you prefer)

## Offscreen document is NOT assumed to be persistent
MV3 may close offscreen documents when idle. Design MUST tolerate:
- offscreen missing at any time
- recreation at any time
- warm start from IndexedDB

## Strategy
- ensureOffscreen(): create if missing
- offscreen warms its in-memory cache from IndexedDB:
  - prompts list
  - embeddings (lazy load or partial preload)
- when UI opens: open a long-lived Port to offscreen (keeps it alive while palette is open)
- when UI closes: disconnect Port; offscreen may be reclaimed later

## Why Port-based keep-alive
Service worker timers are unreliable due to suspension. Port is the most robust "alive while UI is open" mechanism.
