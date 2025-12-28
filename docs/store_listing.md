# FINAL STORE LISTING (MVP)

## Extension name (options)
1) Prompt Vault: Local Prompt Palette
2) Prompt Vault: Keyboard Prompt Launcher
3) Prompt Vault: Local-Only Prompts

## Short description
Cmd/Ctrl+K prompt palette. Local-only, on-demand injection. Type, Enter to insert or copy. No telemetry.

## Detailed description
Prompt Vault is a keyboard-first prompt palette that runs entirely on your device. Open with Cmd/Ctrl+K, type a few letters, and press Enter to drop the text into the active field—or copy if no field is focused. There are no network calls, no telemetry, and no background indexing; everything is local and instant.

The palette injects only when you invoke it, using a deterministic, keyword-only search over a small local prompt set. Results appear immediately, stay stable between opens, and close the moment you press Enter or Esc.

If copy or insert fails (e.g., restricted page), a brief, unobtrusive toast appears; the palette still closes and focus stays put.

## Key features
- Cmd/Ctrl+K opens a prompt palette with focus ready to type.
- Keyword-only, deterministic search with stable ordering.
- Enter inserts into the active editable; if none, it copies instead.
- Esc or outside click closes instantly and restores focus.
- On-demand injection per tab (no always-on content script).
- Local-only: no telemetry, no network calls, no remote storage.
- Brief toast on copy/insert failure without blocking or stealing focus.

## How it works
- Press Cmd/Ctrl+K; the extension injects into the active tab on-demand.
- The palette appears with focus in the search box; start typing.
- Arrow keys move selection; Enter executes immediately; Esc closes.
- If an editable is focused, text inserts at the cursor; otherwise it copies.
- If the page is restricted (e.g., chrome://), injection is skipped and a brief badge “!” appears.

## Permissions justification
- **commands**: to listen for the Cmd/Ctrl+K shortcut.
- **activeTab**: to access only the current tab when you trigger the palette.
- **scripting**: to inject the palette content script into the active tab on-demand; no `<all_urls>` scope.

## Limitations / expected behavior
- Restricted pages (chrome://, Web Store, extensions) cannot be injected; the palette won’t open and the extension icon briefly shows “!”.
- No network access, no telemetry, no cloud storage—everything is local.
