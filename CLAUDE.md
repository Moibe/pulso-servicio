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
