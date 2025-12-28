# UX Spec (Perfect Command Palette)

## Entry
- Hotkey: Cmd+K (Mac) / Ctrl+K (Win/Linux)
- Opens centered palette overlay (or side panel)
- Focus always in input (iframe grabs focus on load; query re-focuses if blurred while open)
- Same hotkey closes when already open; Esc and outside-click close with no flicker

## Interaction
- Typing updates results instantly
- Arrow up/down changes selection
- Mouse: single-click selects and activates; selection scrolls into view when navigating
- Enter executes default action:
  - If active editable: Insert
  - Else: Copy
  - If search is still loading, Enter waits briefly for first results instead of throwing “no results”
- Cmd+Enter (or Ctrl+Enter): always Copy
- Shift+Enter: open detail (preview + variables)

## Results list
Each item shows:
- Title
- Tags (small)
- 1-line snippet preview
- Badges: pinned / site-match

## Ranking behavior
- semantic similarity primary
- pinned gets small boost
- recently used gets boost
- domain-specific prompts boost on matching domain

## Manage prompts
- "New prompt" button or shortcut: Cmd+N inside palette
- Edit: Cmd+E on selected
- Pin toggle: Cmd+P
- Tag edit: Cmd+T

## Variables
If prompt contains `{{var}}`:
- On selection, show quick fill UI
- Provide defaults and last-used values

## Safety UX
- Never insert into password fields
- If field uncertain, default to copy and show hint
- Domain allowlist/denylist optional

## Performance targets
- First open < 150ms perceived
- Search results update < 50ms for common library sizes (~2k)
