# Prompt Vault (Chrome Extension, MV3)

A local-first prompt palette focused on instant keyboard flow.

## MVP Features (UX-first)
- Cmd/Ctrl+K opens (and when open, closes) the palette with focus in the input.
- Deterministic, keyword-only search over a small in-memory prompt set.
- First meaningful result appears quickly; a brief loading indicator shows if search is still in flight.
- Arrow up/down to move selection; Enter executes (and waits briefly if results are still loading); click or double-click works too.
- Enter inserts into the active editable field; if none, copies and surfaces a brief toast.
- Esc or outside click dismisses instantly, with an overlay that blocks stray page clicks.
- First run seeds a few example prompts so you can try the flow immediately.
- Create prompts with Cmd/Ctrl+N and edit the selected prompt with Cmd/Ctrl+E. Changes auto-save locally.
- Keep prompts flat: optional title, comma-separated tags, and pins—no folders required.
- Use `{{variable}}` in a prompt body; selecting it opens a compact value form, then inserts the rendered prompt.

## What it does
- Registers the content script upfront when possible and falls back to on-demand injection when you press Cmd/Ctrl+K.
- Runs locally with no network calls, telemetry, or remote storage.
- Provides brief, unobtrusive toast feedback on copy/insert failure, or when waiting on in-flight results.

## What it does NOT do
- No always-on `<all_urls>` content scripts.
- No embeddings, no remote APIs, no analytics.
- No background indexing or remote storage in the MVP.

## Install (dev)
1. `npm i`
2. `npm run build` (or `npm run dev`)
3. Chrome -> `chrome://extensions`
4. Enable Developer mode
5. Load unpacked -> select the build output (e.g., `dist/` if bundled) or `src/` for MV3 with TypeScript compiled to JS.

## Privacy
Local-only. No telemetry, no embeddings, no network calls in the MVP.
Content script is registered per-Chrome profile and injected only for tabs where the hotkey is used; no background tracking. Prompts and usage signals stay in IndexedDB on the device.

See: `PRIVACY.md`

## Docs
- `docs/ux_non_negotiables.md`
- `docs/scoring_philosophy.md`
- `docs/ux_contract_checklist.md`
- `docs/store_listing.md`

## License
MIT (or choose your preferred license).
