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
- Verify mobile changes at those exact sizes instead of eyeballing them.
- Standing note from the user (2026-08-16), so it does not need repeating.

### Chromium is NOT enough to verify mobile — use WebKit

Learned the hard way on 2026-08-18: a centered-menu change passed a headless
Chromium check at `428x926` and still shipped broken to the owner's phone. Do
not sign off on mobile CSS with Chromium alone — it is a different engine.

- **WebKit is available in this environment.** `npx playwright install webkit`
  then `npx playwright install-deps webkit` (needs root; apt works). Launch with
  `webkit.launch()` — no `executablePath` needed. That is the same engine family
  as iOS Safari, unlike Chromium.
- **The owner's Safari can be OLDER than Playwright's bundled WebKit**, and that
  gap is exactly where bugs hide. Playwright's current WebKit had the offending
  bug already fixed, so it rendered the broken CSS correctly. To test an older
  Safari, install `playwright@1.40.0` in a SEPARATE directory — it ships
  WebKit 17.4 (≈ Safari 17). On Ubuntu 24 it needs 22.04 libs
  (`libicu70`, `libvpx7`): grab the `.deb`s from `archive.ubuntu.com`,
  `dpkg-deb -x` them, and copy the `.so`s into the browser bundle's
  `minibrowser-{gtk,wpe}/sys/lib/`.
- When a mobile bug does NOT reproduce in current WebKit, suspect a version
  difference before doubting the report. The owner's screenshots are evidence.

### iOS Safari gotcha: flex children with `flex-basis: 0`

Safari ≤ 17 computes a content-sized flex container's height (`fit-content` /
`max-content` / `height: auto`) as if a child with `flex-basis: 0%` contributed
nothing. `flex: 1` expands to `flex-basis: 0%`, so a panel sized to its content
collapses to just padding — the children vanish. Chromium never had this bug.

Whenever a container's height comes from its content AND a child uses `flex: 1`,
write `flex: 1 1 auto` (or `flex-basis: auto`) instead. This is what broke the
centered sidebar menu; see the comment in `src/lib/Sidebar.svelte`.
