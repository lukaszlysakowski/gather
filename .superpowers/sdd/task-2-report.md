# Task 2 report — port Attrition engine (erosion via state.activeAg)

Status: IN PROGRESS

## Plan
1. Read task-2-brief.md + global-constraints.md — done.
2. Read attrition/index.js (read-only source) and triptych/index.js (target scaffold) — done.
3. Insert the full engine block (makeNoise2D..buildRender, including rollField) verbatim after
   `const ctrlButtons = {};`, with mechanical CS→FS / PAD→FPAD rename inside engine functions,
   add COUNTS/BALANCE/WAVE_CAP (no EROSION_AG), and the two `EROSION_AG[ui.erosion]` →
   `state.activeAg` edits (eroBentField, runWaves).
4. Remove the now-superseded `function rollField() {}` stub from the pipeline-hooks block
   (real rollField now defined in the engine block); keep runPanels/buildThread stubs.
5. Grep gate: `EROSION_AG` (expect none), `\bCS\b|\bPAD\b` (expect only in triptych scaffold:
   PANELS/etc, never inside engine functions).
6. Commit code.
7. Write task-2-verify.js per brief, run it, expect 6/6 passed.
8. Commit verify script + final report.

## Progress log
- Inserted the full Attrition engine block (makeNoise2D..buildRender, incl. rollField) into
  index.js after `const ctrlButtons = {};`, replacing the old `function rollField() {}` stub.
  runPanels/buildThread stubs remain below it, still unfilled (out of scope for Task 2).
- Added COUNTS/BALANCE/WAVE_CAP near the engine constants (FLOW_SPEED block). Did NOT add
  EROSION_AG.
- Renamed CS→FS, PAD→FPAD inside pageToGrid, gridGrad, inRegion, waveStarts, samplePt (all
  occurrences inside engine functions).
- Applied the one engine edit in both eroBentField and runWaves: `const ag = state.activeAg;`
  (was `EROSION_AG[ui.erosion]`).
- Grep gate: `grep -n 'EROSION_AG' index.js` → no output. `grep -n '\bCS\b|\bPAD\b' index.js` →
  no output at all (Triptych's own scaffold uses SC/SW/TW/TH/PANELS/P, none of which match the
  bare-word grep, and the engine now uses FS/FPAD throughout).
- `node --check index.js` → syntax OK. Verified via grep that every function in the Produces
  list appears exactly once and in Attrition's original order.
- Committing code now, then will write + run task-2-verify.js.

---
## Completion (controller salvage — implementer subagent paused mid-verify)
Status: DONE. The implementer committed the port (5296b0d) with grep gate clean, then paused waiting on the slow verify. Controller salvaged: committed the verify script, ran it (background, 264s): **6 passed, 0 failed** (ag=0 baseline E-zero/no-frontier/held-in-(0,1); monotone fierce<gentle<off; frontier+segs at ag=1; determinism). Independent review confirmed the port is faithful — normalized-diff check found ONLY the CS→FS/PAD→FPAD rename + the two state.activeAg edits (+ one inert comment-placement difference). Grep gates: no EROSION_AG, no bare CS/PAD anywhere. COUNTS/BALANCE/WAVE_CAP present verbatim.
