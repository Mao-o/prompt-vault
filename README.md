# Prompt Vault (Chrome Extension, MV3)

A local-first prompt palette focused on instant keyboard flow.

## MVP Features (UX-first)
- Cmd/Ctrl+K opens the palette with focus in the input.
- Deterministic, keyword-only search over a small in-memory prompt set.
- First meaningful result appears immediately; no loading states.
- Arrow up/down to move selection; Enter executes immediately.
- Enter inserts into the active editable field; if none, silently copies.
- Esc dismisses instantly and restores prior focus.

## What it does
- Injects into the active tab on-demand (when you press Cmd/Ctrl+K).
- Runs locally with no network calls, telemetry, or remote storage.
- Provides brief, unobtrusive toast feedback only on copy/insert failure.

## What it does NOT do
- No always-on `<all_urls>` content scripts.
- No embeddings, no remote APIs, no analytics.
- No background indexing or persistent storage in the MVP.

## Install (dev)
1. `npm i`
2. `npm run build` (or `npm run dev`)
3. Chrome -> `chrome://extensions`
4. Enable Developer mode
5. Load unpacked -> select the build output (e.g., `dist/` if bundled) or `src/` for MV3 with TypeScript compiled to JS.

## Privacy
Local-only. No telemetry, no embeddings, no network calls in the MVP.
On-demand injection: the content script is injected into the active tab only when you press Cmd/Ctrl+K (no always-on `<all_urls>` scope).

See: `PRIVACY.md`

## Docs
- `docs/ux_non_negotiables.md`
- `docs/scoring_philosophy.md`
- `docs/ux_contract_checklist.md`
- `docs/store_listing.md`

## License
MIT (or choose your preferred license).
