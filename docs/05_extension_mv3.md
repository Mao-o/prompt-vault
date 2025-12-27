# Chrome Extension (MV3) Notes

## Permissions
Minimum recommended:
- "storage" (or use IndexedDB without permission depending on approach)
- "commands"
- "activeTab" (for insertion)
- "scripting" (if injecting)
- host_permissions: "<all_urls>" (or narrower)

## Offscreen
- Use chrome.offscreen.createDocument
- Keep it alive on demand
- Message passing:
  chrome.runtime.sendMessage / onMessage
  or chrome.runtime.connect ports for streaming

## UI surface options
A) Extension page (tab/window) -> easiest
B) Side panel -> great UX, but availability differs
C) Injected overlay UI -> fastest feel, but more invasive

Recommended MVP: Extension page overlay-like window, then iterate.

## Content script insertion
- Detect active element:
  input/textarea/contenteditable
- Insert at cursor preserving selection
- Avoid password fields and sensitive types

## CSP
MV3 has strict CSP; avoid eval and remote scripts.

## Build
- TypeScript -> bundled with esbuild/vite/rollup
- Output manifest.json with correct paths
