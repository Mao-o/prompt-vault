# UX Contract Checklist (MVP manual)

Run these steps in order; each must succeed without hesitation, spinners, or mode switches.

1) **Cold open**
   - Action: Load a page, press Cmd/Ctrl+K.
   - Expect: Palette appears within a frame, input focused, initial results visible immediately.

2) **Warm open**
   - Action: Close with Esc, press Cmd/Ctrl+K again.
   - Expect: Same initial ordering as cold open; no flicker or delay.

3) **Typing responsiveness**
   - Action: Type “su”.
   - Expect: First meaningful result appears immediately (<50ms) and stays stable while adding/removing characters.

4) **Ranking stability**
   - Action: With the default sample data, query “su”.
   - Expect order: 1) Summarize text, 2) General helper, 3) Bug report. Reopen palette; order unchanged.

5) **Keyboard navigation**
   - Action: Arrow Down/Up cycles selection; Enter activates; Esc dismisses.
   - Expect: Selection highlight moves predictably; no jumps; Esc closes instantly.

6) **Insert vs copy**
   - Action: Place cursor in a textarea; select a result and press Enter.
   - Expect: Text inserts at cursor, selection preserved, focus stays in the field after palette closes.
   - Action: Blur all editables (click body), press Enter on a result.
   - Expect: Text copied to clipboard; no errors; palette closes.

7) **Dismissal / focus restore**
   - Action: Press Esc or click outside the palette iframe.
   - Expect: Palette disappears in one frame; focus returns to the element active before opening; page shortcuts remain intact.

8) **Failure modes: copy**
   - Action: Temporarily block clipboard (deny permission) and trigger copy path (no active editable).
   - Expect: Palette closes; a single-line toast appears briefly (“Copy failed. Try again.”); focus returns to prior element; no blocking dialogs.

9) **Failure modes: insert**
   - Action: Ensure no active editable (or an unsupported target), press Enter on a result.
   - Expect: Best-effort copy attempted; if insertion and copy both fail, the same brief toast appears; palette still closes; focus restored.

10) **Restricted pages**
    - Action: Press Cmd/Ctrl+K on a restricted page (e.g., chrome://extensions).
    - Expect: Palette does not open; extension badge briefly shows “!”; no dialogs, no focus change.

11) **First-run injection**
    - Action: On a normal page, press Cmd/Ctrl+K for the first time.
    - Expect: Content script injects on-demand, palette opens instantly, same ordering as warm opens; subsequent opens do not create duplicates.
