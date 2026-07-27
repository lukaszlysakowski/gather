# Triptych — SDD Progress Ledger

## Timeout-resilience protocol (BINDING — user-mandated; heaviest build, 3 settles/regenerate)
- Implementers: commit incrementally after each step; create task-N-report.md at task START.
- Verifies are SLOW. Commit code FIRST, then run the verify. Keep any single run connection-safe (Low count / Light settle in heavy checks).
- Controller: tiny result / "session limit" / API connection drop = killed subagent. Salvage committed work from git; RUN THE VERIFY YOURSELF as a detached background Bash command if it died mid-run (as done for Attrition Task 8). CONTROLLER INLINE fallback with attribution. Do NOT re-dispatch until reset.

## Anti-overfit (BINDING)
- Transcribe verbatim. If a test fails, report DONE_WITH_CONCERNS with measurements — never change production code or test thresholds/probes to force a pass, NEVER flip an assertion direction.
- held[L] > held[C] > held[R] and "more ag → less held" are PHYSICALLY REQUIRED directions.

## Task log
Task 1: complete (commits 7eed98f..37c2f40, verify 8/8, review clean incl browser load; byte-identical to brief, CSS byte-identical to Attrition, wide 3830×1690 landscape canvas scales correctly — first non-square in family). Launch config triptych:3466 added by controller.
Task 2: complete (commits 5296b0d..HEAD, verify 6/6, review clean — port FAITHFUL). Implementer subagent PAUSED mid-verify (timeout-protocol scenario); CONTROLLER SALVAGED: committed verify script, ran it as detached background command (264s), backfilled report. Engine port verbatim — reviewer's normalized-diff found ONLY the CS→FS/PAD→FPAD rename + 2 state.activeAg edits (+ inert comment shift). Grep gates clean (no EROSION_AG, no bare CS/PAD). COUNTS/BALANCE/WAVE_CAP added verbatim.
