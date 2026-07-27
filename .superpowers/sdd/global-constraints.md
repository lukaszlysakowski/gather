## Global Constraints

- Field-coordinate space (Attrition's native, per panel, internal): `FS = 2170`, `FPAD = Math.round(FS*0.04)` (= 87), field region `[FPAD, FS−FPAD]²`, `GRID_N = 300`.
- Triptych canvas: `SC = 1500`, `SW = 1000`, `G = 70`, `P = 95`; `TW = P+SW+G+SC+G+SW+P = 3830`, `TH = P+SC+P = 1690`. Panel rects (x0,y0,side): LEFT `(95, 345, 1000)`, CENTER `(1165, 95, 1500)`, RIGHT `(2735, 345, 1000)` (wings vertically centered on the center midline: `y0 = P + (SC−SW)/2 = 345`).
- Paper `#F7E6D4`, ink `#1A1613` (rgb 26,22,19), red `#A93B2A`. Red appears ONLY in the Thread pass.
- Engine constants (verbatim from Attrition): `FLOW_SPEED 6`, `CURL_H 1.5`, `DEP_AMOUNT 1`, `ERODE_AMOUNT 1`, `SLOW 0.7`, `DIVERT 0.9`, `SLOW_FLOOR 0.15`, `HUNT 1.2`, `DT 1`, `MAX_STEPS 400`, `STALL_EPS 0.4`, `SETTLE_EPS 0.02`, `HEAVY_THRESH 0.28`, `EROSION_EPS 1e-4`. Gradient gates `> 1e-6` (do NOT tighten to 1e-9).
- Progression triads (ag left/center/right, strictly increasing): Early `[0.15,0.35,0.70]`, Rising (default) `[0.30,0.60,1.00]`, Late `[0.60,1.00,1.40]`.
- Erosion is driven by module-level `state.activeAg` (set by the orchestrator before each panel run), NOT the `EROSION_AG[ui.erosion]` index — the ONLY change to the ported engine.
- Determinism: `Math.random` ONLY at seed choice (`regenerate(true)`) + `randomizeAll`. `rollField` runs ONCE from `masterSeed`; the three panel runs differ only by `state.activeAg`. Per-wave/species seeded RNG (`masterSeed + w*9161` dep, `+ w*7331` ero) verbatim. Wobble reseeds from `pts[0].x*0.01+50`; default OFF.
- SVG pen passes, exact labels/weights: Borders ink 0.9 · Streaks-light ink 0.4 · Streaks-heavy ink 0.8 · Thread red 1.7 · Signature ink 0.9. M/L-only paths.
- Signature: `Triptych · seed N · <L> <C> <R>% held  YYYY-MM-DD HH:MM` (L/C/R = Math.round(100*heldFrac) for the three panels).
- A11y floor: sidebar CSS copied from Attrition (`--muted: #969082`, `.ctrl` min-height 24px). Container div id `canvas-container`.
- Read-only sources (NEVER modify): `/Users/lukasz/genuary-2026/sketches/attrition/*`.
- **TIMEOUT-RESILIENCE (user-mandated, binding — heaviest build in the family, 3 settles/regenerate):** incremental commits after every step; write `.superpowers/sdd/task-N-report.md` at task START, update as you go. Verify scripts are SLOW — keep any single verify inside a connection-safe window: the engine port (Task 2) tests cheaply at one fixed ag/Low count; the three-panel + soak checks (Tasks 3, 7) use Low count + Light settle. If a verify would run long, the implementer commits code first, then runs the verify; the CONTROLLER may run a slow verify as a detached background Bash command (as done for Attrition Task 8). Controller: a tiny result / "session limit" / connection drop = killed subagent — salvage committed work from git, run the verify yourself if it died mid-run, CONTROLLER INLINE fallback with ledger attribution; do NOT re-dispatch until reset.
- **ANTI-OVERFIT (binding):** transcribe verbatim; if a test fails, report DONE_WITH_CONCERNS with measurements — never change production code or test thresholds/probes to force a pass, and NEVER flip an assertion direction. `held[L] > held[C] > held[R]` and "more ag → less held" are physically-required directions.
- Controller note: after Task 1, add launch config `triptych` (npx serve `/Users/lukasz/genuary-2026/sketches/triptych` --listen 3466, port 3466) to `/Users/lukasz/claude/self-redaction/.claude/launch.json`.

---
