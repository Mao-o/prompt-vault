# FINAL STORE LISTING (MVP)

## Extension name (options)
1) Prompt Vault: Local Prompt Palette
2) Prompt Vault: Keyboard Prompt Launcher
3) Prompt Vault: Local-Only Prompts

## Short description
Cmd/Ctrl+K prompt palette. Local-only, pre-registered where allowed, and on-demand when needed. Type, Enter (or click once) to insert or copy. No telemetry.

## Detailed description
Prompt Vault is a keyboard-first prompt palette that runs entirely on your device. Open with Cmd/Ctrl+K, type a few letters, and press Enter (or single-click a result) to drop the text into the active field—or copy if no field is focused (with a brief toast). There are no network calls, no telemetry, and no background indexing; everything is local and fast, with a brief loading indicator if search is still running.

The palette registers its content script upfront where allowed and injects on-demand when you invoke it, using a deterministic, keyword-only search over a small local prompt set. Results appear quickly and stay stable between opens; if a search is still in flight, a short loading state is shown. The palette closes the moment you press Enter, Esc, or Cmd/Ctrl+K while open.

If copy or insert fails (e.g., restricted page), a brief, unobtrusive toast appears; the palette still closes and focus stays put. On non-editable pages it copies by design and surfaces a toast.

## Key features
- Cmd/Ctrl+K opens a prompt palette with focus ready to type (and closes it when already open).
- Keyword-only, deterministic search with stable ordering.
- Enter inserts into the active editable; if none, it copies instead; single-click runs the selection immediately.
- Esc or outside click closes instantly and restores focus.
- Registers the content script per-profile and injects per tab on demand (no telemetry or tracking).
- Local-only: no telemetry, no network calls, no remote storage.
- Brief toast on copy/insert failure without blocking or stealing focus; a short toast appears if you press Enter before results are ready.

## How it works
- Press Cmd/Ctrl+K; the extension pre-registers the content script and injects into the active tab on-demand if needed.
- The palette appears with focus in the search box; start typing or click a result.
- Arrow keys move selection; Enter executes (waiting briefly if results are still loading); Esc or Cmd/Ctrl+K closes.
- If an editable is focused, text inserts at the cursor; otherwise it copies and shows a toast.
- If the page is restricted (e.g., chrome://), injection is skipped and a brief badge “!” appears.

## Permissions justification
- **commands**: to listen for the Cmd/Ctrl+K shortcut.
- **activeTab**: to access only the current tab when you trigger the palette.
- **scripting**: to register/inject the palette content script into the active tab; no telemetry.

## Limitations / expected behavior
- Restricted pages (chrome://, Web Store, extensions) cannot be injected; the palette won’t open and the extension icon briefly shows “!”.
- No network access, no telemetry, no cloud storage—everything is local.
