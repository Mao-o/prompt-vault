# UX NON-NEGOTIABLES (Constitution)

- **No explicit saves, ever.** State changes auto-commit as the user types or navigates; forcing a save click inserts friction and breaks flow, turning the palette into a traditional form instead of a thinking extension.
- **No folders or mandatory hierarchy.** Prompts stay flat with lightweight tags/pins; requiring structure forces premature organization, slowing capture and recall when the user is in a fast flow.
- **No required titles.** Users can capture and reuse fragments without naming; forcing titles interrupts thought, increases cognitive load, and discourages quick jotting.
- **First meaningful result within ~50ms of typing.** The palette must surface a useful candidate almost immediately; slower feedback breaks the “instant recall” illusion and teaches users to distrust the tool mid-flow.
- **Selection is single-keystroke, no confirmation.** Hitting Enter (or the default action key) must immediately act; confirmation dialogs or multi-step commits add latency and hesitation, violating the command palette muscle memory.
- **Keyboard-only is fully sufficient.** Every action—open, search, select, insert/copy, edit—must be reachable without the mouse; requiring pointer use slows expert workflows and breaks accessibility for power users.
- **UI disappears instantly, leaving no residue.** Closing after an action must remove all overlays/frames and focus the prior element; lingering UI or focus traps reminds users of the tool instead of letting them continue their task.
- **Never block on remote dependencies by default.** Queries and inserts must remain responsive even if embeddings or network providers are unavailable; blocking on remote calls erodes trust and breaks the “local-first, always-ready” contract.
- **No forced mode switches.** The same palette interaction must serve capture, search, and action without jumping to separate pages; mode switches impose context rebuilds and mental overhead.

## Why breaking these rules harms UX
- Violating the **no-save** rule turns a frictionless capture tool into a form workflow, causing users to abandon mid-thought.
- Introducing **hierarchy or required titles** forces metadata decisions before capture, delaying flow and discouraging quick snippets.
- Missing the **50ms first-result** target makes the palette feel sluggish, leading users to fallback to manual recall or other tools.
- Adding **confirmations or multi-step selection** slows the primary action path and undermines muscle memory built around single-keystroke execution.
- Requiring **mouse interactions** blocks fast, eyes-on-text workflows and excludes users who depend on keyboard or assistive tech.
- Leaving **UI residue** after actions distracts and breaks the illusion of an invisible helper, increasing cognitive load.
- **Remote stalls** contradict the promise of local-first reliability, teaching users that the tool may fail when offline or rate-limited.
- Forcing **mode switches** fractures context, making users reorient and reducing the sense that the palette is an extension of thought.
