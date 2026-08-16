# Project-level rules for `pulso-servicio`

## Commit + push automatically (overrides the global "never push" rule)

For THIS project only, at the end of a turn where there are ready, verified
changes: commit them and **push** without waiting for separate confirmation.
This overrides the user's global `~/.claude/CLAUDE.md` "never push" rule,
which still applies normally to every other project.

- Never add a `Co-Authored-By` trailer (or any co-authorship) to commits in
  this repo — commits should show only the user as author, same as the
  existing history.
- Still use normal judgment about *what* to commit (review `git status`,
  don't stage secrets, don't commit half-finished/broken work).
- This is a standing instruction from the user (given 2026-07-20), not a
  one-time approval — keep doing it on future turns without re-asking.

## Reference device for mobile (mobile-first)

The owner reviews this site on an **iPhone 12 Pro Max, Safari on iOS**. That is
the device any mobile-first work should target, and the one bug reports come
from — so assume that viewport when a report says "on mobile it looks like X".

- Portrait: `428 x 926` CSS px · Landscape: `926 x 428` CSS px · DPR 3.
- Landscape (926px) is WIDER than the `768px` breakpoint used across the app,
  so a `max-width: 768px` rule does NOT apply to this phone in landscape.
  To target portrait only: `@media (max-width: 768px) and (orientation: portrait)`.
- iOS Safari zooms in when focusing an input with `font-size < 16px`; the root
  layout already forces 16px on mobile inputs to prevent it.
- Verify mobile changes at those exact sizes instead of eyeballing them — a
  headless Chromium at `428x926` reproduces the layout faithfully.
- Standing note from the user (2026-08-16), so it does not need repeating.
