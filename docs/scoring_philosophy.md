# Scoring Philosophy

## Core aim
Ranking should feel like the system already knows the user’s intent, stays stable as habits form, and never surprises power users who rely on muscle memory. Predictability outweighs marginal semantic gains.

## Principles
- **The #1 result is sticky once learned.** When a user repeatedly accepts the same result for similar inputs, that pairing should become a default. Dislodging it should require a clearly better candidate (e.g., a new, much more relevant prompt repeatedly chosen). This builds trust that “Enter will do what I expect.”
- **Recency boosts without volatility.** Recent selections should gently lift familiar prompts, but not reorder the list on every use. Think “gravitational pull,” not “bouncing.” A prompt used today should rise above one used a month ago, yet repeated use should stabilize its position.
- **Ambiguity resolves to habit first.** If multiple prompts fit, prefer the one the user has historically chosen for similar queries or contexts. Semantic ties go to habitual winners, reducing decision friction.
- **Semantic yield to habit/frequency.** When semantic match is close but the user has a strong history with another prompt for that query pattern, the habitual prompt should stay on top. Only clear semantic superiority plus repeated user choice should shift the top slot.
- **Weak vs strong signals.**  
  - Strong: consistent past selections for similar queries, pins, clear recent use.  
  - Moderate: semantic similarity, light recency, site match.  
  - Weak: rare tags/keywords, age (unless very stale), minor text overlap.  
  Weak signals should never overturn a strong habitual top pick on a whim.
- **Fallback feels identical.** If embeddings are missing or degraded, keyword-only ranking should mimic prior ordering as closely as possible: preserve habitual winners, keep recency and pins, and avoid sudden reshuffles. The user should not perceive a mode change.

## Tradeoffs in plain language
- If the user types “summ” and has repeatedly picked “Summarize this page,” that prompt stays #1 even if a newly added “Summer sale blurb” is semantically close; only repeated selection of the new prompt should flip the order.
- If the user hasn’t used a prompt in weeks, a recently used alternative may rise above it, but once the user reaffirms the old favorite, it should quickly regain its spot and stay there.
- When the query is vague (“update”), the system should favor the prompt the user habitually picks for “update,” not whichever happens to have the closest text embedding.
- In degraded/fallback modes, the top few items should look the same as before: pins remain high, habitual favorites remain #1, and new items earn their place only after the user actually selects them.

## User expectation safeguarding
- Stability over surprise: minor text edits or new prompt additions should not reorder trusted top results unless the user explicitly chooses the newcomer a few times.
- Predictable recency: using a prompt today nudges it up; not using it for a long time slowly relaxes its grip, but never causes whiplash.
- Habit wins ties: when in doubt, assume the user wants what they chose last time for similar input and context.

## Deterministic sample ordering (MVP dataset)
- Prompts: General helper (pinned), Summarize text, Bug report.
- Query `""` (empty): 1) General helper, 2) Summarize text, 3) Bug report.
- Query `"su"`: 1) Summarize text, 2) General helper, 3) Bug report.
- After selecting Summarize text once, reopening with the same query keeps Summarize text at #1 (sticky top).
