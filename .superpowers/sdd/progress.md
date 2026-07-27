# Triptych — SDD Progress Ledger

## Timeout-resilience protocol (BINDING — user-mandated; heaviest build, 3 settles/regenerate)
- Implementers: commit incrementally after each step; create task-N-report.md at task START.
- Verifies are SLOW. Commit code FIRST, then run the verify. Keep any single run connection-safe (Low count / Light settle in heavy checks).
- Controller: tiny result / "session limit" / API connection drop = killed subagent. Salvage committed work from git; RUN THE VERIFY YOURSELF as a detached background Bash command if it died mid-run (as done for Attrition Task 8). CONTROLLER INLINE fallback with attribution. Do NOT re-dispatch until reset.

## Anti-overfit (BINDING)
- Transcribe verbatim. If a test fails, report DONE_WITH_CONCERNS with measurements — never change production code or test thresholds/probes to force a pass, NEVER flip an assertion direction.
- held[L] > held[C] > held[R] and "more ag → less held" are PHYSICALLY REQUIRED directions.

## Task log
