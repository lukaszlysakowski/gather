# Triptych — Design Spec (2026-07-13)

## Concept

**Triptych — one contested ground, three moments.** The family's first multi-panel piece.
A single Attrition field (one shared seed) is rendered three times across the panels as the
same battle unfolding in time — LEFT the ground barely touched (light erosion), CENTER the
contest at its height (the theme), RIGHT the ground overrun (fierce erosion). Read left to
right, it is a Harold Fisk river-meander map made literal: the history of a channel that
erased and rewrote itself, shown as before / during / after; and a religious triptych in
form — a dominant central image flanked by two attending wings.

Classical altarpiece proportions: a dominant central square flanked by two smaller square
wings, the wings vertically centered on the center's midline so every field stays square (no
distortion of Attrition's isotropic curl flow). Thin paper gutters between; each panel framed
by its own border. Landscape format. Reads as corroded metal / moth-eaten cloth / a
river-history map, told in three states.

**The one red — "the war is one war."** Each panel has its own frontier (its C=0 truce line),
and Triptych stitches these across the gutters with red connectors into ONE continuous red
thread: it enters the left panel, crosses into the center, crosses into the right, and exits.
Genuinely one red line on the whole page — every segment a real frontier from its own panel,
joined into a single mark. Each panel contributes its longest frontier chains via
`THREAD_CHAINS = [1, 5, 1]` (`panelThreadChains` → `stitchThread`): the wings hold plenty of
contested frontier, so their single dominant chain suffices; the dense CENTER (barely eroded,
so it holds very little frontier) stitches its **five** longest chains — ordered left→right —
so the thread still travels through the center rather than clipping one short arc. All other
frontier fragments are discarded — one red, one meaning, one thread.

Decisions made during brainstorming (user-approved):
- **The variation:** three erosion moments of one shared field (same seed) — the three triad
  levels. **Placement (updated):** the dominant CENTER panel carries the densest, most-intact
  render (gentlest erosion); the wings flank it, LEFT medium and RIGHT heaviest — the mass reads
  centered, an intact core between two states of ruin (classical/icon framing). Held reads
  `center > left > right`. (Originally the three were placed left→right untouched→overrun as a
  time-lapse; the reorder keeps the same three levels but anchors the densest one in the big
  center panel — see `PANEL_AG_ORDER = [1,0,2]` in `runPanels`.)
- **Proportions:** center-dominant classical (center square `Sc`, wings `Sw ≈ Sc/1.5`, wings
  vertically centered).
- **Interaction:** full maker — reroll the shared seed, all three panels regenerate together.
- **The red:** one continuous red thread spanning all three panels (each panel's dominant
  frontier chain, joined across the gutters).
- **Name:** Triptych.
- **Scope:** full family maker, local git repo first; GitHub publish only when asked.

## Page & livery

- Landscape canvas. Center square `SC = 1500`; wing square `SW = 1000` (= round(SC/1.5));
  gutter `G = 70`; outer pad `P = 95`.
  - Canvas width `TW = P + SW + G + SC + G + SW + P = 3830`.
  - Canvas height `TH = P + SC + P = 1690`.
  - Panel rects (x, y, size): LEFT `(P, P + (SC−SW)/2, SW)` = `(95, 345, 1000)`;
    CENTER `(P + SW + G, P, SC)` = `(1165, 95, 1500)`;
    RIGHT `(P + SW + G + SC + G, P + (SC−SW)/2, SW)` = `(2735, 345, 1000)`.
  - The RIGHT panel is **horizontally mirrored** (`flip: true` on its rect; `panelMap` maps
    `u → 1−u` for it) so the two wings face inward toward the center — a symmetric, icon-like
    framing. Both the ink streaks and the red thread route through `panelMap`, so they mirror
    together and stay registered; the thread is oriented left→right in SCREEN space (after the
    flip) so it still reads continuously across the gutters.
- Paper `#F7E6D4`, ink `#1A1613`, red `#A93B2A` (the thread is the ONLY red).
- Each panel: a thin ink border rectangle at its rect (the three frames).
- Signature bottom-left inside the outer pad:
  `Triptych · seed N · <L> <C> <R>% held  YYYY-MM-DD HH:MM`
  (L/C/R = round(100 × heldFrac) for the three panels — the progression quantified).
- House idiom: single `index.html` + `index.js`, vendored `p5.min.js`, no build step.
- Sidebar CSS copied from Attrition/Drift (a11y floor: `--muted #969082`,
  `.ctrl min-height 24px`; Lighthouse a11y 100 — never regress). Container div id
  `canvas-container`.

## Engine

The Attrition engine is ported verbatim and runs in its native field-coordinate space
`FS = 2170`, `FPAD = round(FS·0.04) = 87`, field region `[FPAD, FS−FPAD]²`, deposition grids
`GRID_N = 300`. Triptych's novelty is the meta-composition over it.

### Ported Attrition pipeline (verbatim, per panel)

Curl base field (`makeNoise2D`, `potential`, `baseField`), dual grids (`D`, `E`, `C = D−E`,
`splat`, `smoothGrid`, `gridNorm`, `Cat`/`DhatAt`/`CposHatAt`, `gridGrad`), the two bent
fields (`depBentField` channelize on `CposHat`; `eroBentField` hunt up `∇Dhat`), the
two-phase FROZEN wave loop + settle-to-truce (`runWaves`), segment culling (`cullPath`) and
the C=0 frontier (`marchLevelC`, gated to contested cells `E > EROSION_EPS`). All constants
verbatim: `FLOW_SPEED 6`, `CURL_H 1.5`, `DEP_AMOUNT 1`, `ERODE_AMOUNT 1`, `SLOW 0.7`,
`DIVERT 0.9`, `SLOW_FLOOR 0.15`, `HUNT 1.2`, `DT 1`, `MAX_STEPS 400`, `STALL_EPS 0.4`,
`SETTLE_EPS 0.02`, `HEAVY_THRESH 0.28`, `EROSION_EPS 1e-4`. Gradient gates `> 1e-6`.

**Parameterization change (the only engine edit):** erosion is driven by a direct aggression
value `ag` rather than the `EROSION_AG[ui.erosion]` index, so each panel can be given its own
`ag`. `runWaves(ag)` and `eroBentField` take `ag` as a parameter; `Pe = ag <= 0 ? 0 : total − Pd`.
All splats and hunt use the passed `ag`. Nothing else in the engine changes.

### One shared field, three erosions

- `rollField()` runs ONCE from `masterSeed` → the shared curl potential + field params (the
  same terrain for all three panels).
- **Progression** control selects an `ag` triad `[agL, agC, agR]` (left/center/right), strictly
  increasing. The triads are deliberately wide-span so the three panels read as *distinct erosion
  moments* (near-pristine left, contested center, overrun right) rather than small variations of
  one theme — and so even erosion-resistant fields still show a clear three-way split. Left `ag`
  is very low (near-pristine wing); right `ag` runs well past the settle-to-truce knee (the right
  wing bottoms out around ~25–35% held on erodible fields, torn into blotchy masses):
  - Early → `[0.12, 0.90, 1.80]`
  - Rising (default) → `[0.22, 1.20, 2.60]`
  - Late → `[0.38, 1.55, 3.40]`
  The three levels are placed into panels via `PANEL_AG_ORDER = [1, 0, 2]` (left←mid, center←
  gentlest/densest, right←heaviest), so held reads `center > left > right`. Measured held% per
  panel L/C/R (Low count / Light settle): resistant seed ≈ 76/98/50 (Early) → 55/95/30 (Late);
  erodible seed ≈ 76/99/49 (Early) → 54/97/24 (Late). Every preset keeps `held[C] > held[L] >
  held[R]` with wide margins (no ties — the strict placement invariant holds).
- For each panel `i` in {L, C, R}: reset grids, `runWaves(ag[PANEL_AG_ORDER[i]])`, `buildRender()`, and capture
  `panel[i] = { segments, frontierChains, heldFrac }` in field coords. Depositor Count, Balance,
  Seeding, and Settle are identical across the three; only `ag` differs → the eye reads the same
  ground carved to three depths.
- `state.panels = [L, C, R]`. `state.held = [heldFracL, heldFracC, heldFracR]`.

### Layout mapping

`panelMap(pt, rect)`: maps a field-space point `(x,y) ∈ [FPAD, FS−FPAD]²` into panel `rect`
`{x0, y0, s}` (square side `s`):
```
u = (x − FPAD) / (FS − 2·FPAD);  v = (y − FPAD) / (FS − 2·FPAD)
→ { x: rect.x0 + u·rect.s, y: rect.y0 + v·rect.s }
```
Each panel's segments and the chosen thread chain are mapped through its own rect. Fields stay
square (uniform scale) → no flow distortion. Rects do not overlap (gutters guarantee spacing).

### The one red thread (built after all three panels render)

1. In each panel, pick the **dominant frontier chain** = the chain with the greatest summed
   segment length (`Σ |vᵢ₊₁ − vᵢ|`) among `panel[i].frontierChains`. If a panel has no frontier
   (e.g. `agL` produced no contested cells), that panel contributes no chain (the thread simply
   spans the panels that have one; see edge handling).
2. Orient each chosen chain left→right: if its last vertex's x < its first vertex's x, reverse it.
3. Map each chosen chain into its panel rect via `panelMap`.
4. Concatenate into ONE polyline `state.thread`:
   `mappedLeft ++ [connector] ++ mappedCenter ++ [connector] ++ mappedRight`, where each
   connector is the straight red segment from the right (last) endpoint of one mapped chain to
   the left (first) endpoint of the next. The connectors bridge the paper gutters.
5. **Edge handling:** the thread is the ordered concatenation of whatever chains exist
   (left→center→right), with connectors only between consecutive present chains. With ≥ 1 chain
   there is exactly one `state.thread` polyline (possibly a single panel's chain if the others
   are empty). All non-chosen frontier fragments are discarded.

### Determinism

`Math.random` ONLY at seed choice + `randomizeAll`. One `masterSeed` seeds `rollField`; the
three panel runs differ only by `ag`, each fully deterministic (Attrition's per-wave/per-species
seeded RNG — depositors `masterSeed + w·9161`, eroders `masterSeed + w·7331` — carries over,
identical across panels except where `ag` changes the eroder dynamics). Same seed → identical
triptych, thread included.

## Rendering & export

Draw order (back → front): paper → for each panel {streaks-light, streaks-heavy} → red thread →
three panel borders → signature. Depositor sub-segments keep Attrition's heavy/light classes,
mapped through `panelMap`.

SVG pen passes via family `svgPass(label, color, weight, paths)` — M/L-only paths:

| Pass          | Color | Weight |
|---------------|-------|--------|
| Borders       | ink   | 0.9    |
| Streaks-light | ink   | 0.4    |
| Streaks-heavy | ink   | 0.8    |
| Thread        | red   | 1.7    |
| Signature     | ink   | 0.9    |

- Canvas/SVG parity: identical geometry arrays feed both renderers. Wobble (default OFF) seeded
  from `pts[0].x·0.01+50` in both.
- Exports: SVG, PNG, PNG 4x (`exportPNG(scale)` pixelDensity re-render). Note PNG 4x is large
  (15320 × 6760) — acceptable.

## Maker UI

Family sidebar (cycleCtrl / CONTROL_DEFS / setupControls / randomizeAll):

- **Field:** Scale (Fine/Med/Broad) · Strength (Low/Med/High) — the shared curl terrain.
- **Populations:** Count (Low/Med/High) · Balance (More-eroders/Even/More-depositors) ·
  Seeding (Scattered/Edge/Clustered) — identical across all three panels.
- **Progression:** Early / Rising / Late (the erosion triad, default Rising).
- **Settle:** Off/Light/Full (default Light).
- **Style:** Wobble (On/Off, default Off).
- Buttons: randomize / refresh / svg / png / png 4x.
- Click canvas = new seed, same params. Randomize = reroll aesthetic controls + new seed
  (Wobble left as set). Refresh = new seed, same params.
- No rating/learning system.
- **Performance:** each regenerate runs THREE full Attrition settles (~3× a single panel).
  Defaults stay modest (Count Low, Settle Light). The browser handles a default triptych in a
  handful of seconds per panel; Full settle at higher Count is the heavy end.

## Testing

Node harness: `.superpowers/sdd/p5-stub.js` (seeded splitmix32) + `vm.runInContext` of the real
`index.js` (ported from attrition/.superpowers/sdd/). **This build is compute-heavy (3 settles
per regenerate); verify scripts are SLOW — calibrate all time bounds and soak parameters to the
Node stub (which is ~20× slower than the browser), and keep any single verify run inside a
connection-safe window (use Low count / fewer waves in the heaviest checks, as Attrition's Task
8 did).** Per-task verify scripts assert at minimum:

1. Ported engine: reuse Attrition's engine checks (curl divergence-free; grids/contested field;
   two bent fields channelize/hunt correctly; frozen-field two-phase wave; cull + frontier) — the
   port must behave identically to Attrition at a fixed `ag`.
2. `runWaves(ag)` parameterization: `ag=0` → `Pe=0`, `E≡0`, no frontier (Attrition's Off
   baseline); larger `ag` → more lost ground (monotone).
3. Shared field: all three panels use the identical `rollField` output (same potential params);
   the three runs differ only by `ag`.
4. Placement is real: `held[C] > held[L] > held[R]` (center densest, then left, then right —
   more erosion holds less ground, and the gentlest level is placed in the center via
   `PANEL_AG_ORDER`), for the default Rising triad and at least one other seed.
5. `panelMap`: maps field corners to panel-rect corners exactly; the three rects are
   non-overlapping and wings are vertically centered on the center midline; all mapped geometry
   lies within its panel rect (± a small overshoot tolerance, as in Attrition).
6. The thread: exactly ONE `state.thread` polyline; it is continuous (no NaN, ≥ 2 vertices); it
   spans the present panels (its x-range covers left-panel x through right-panel x when all three
   have frontiers); each contributing chain is the LONGEST frontier chain of its panel; oriented
   left→right; connectors bridge the gutters.
6b. Thread edge case: a triad where a wing has no frontier still yields exactly one thread from
   the panels that do (no crash, no second red polyline).
7. Export: SVG has exactly the 5 passes, M/L-only path data, red appears only in the Thread pass;
   signature shows three held% values in `L C R` order.
8. Determinism: same seed twice → deep-equal panels + thread + held.
9. Multi-seed soak: a few seeds produce three non-empty panels + a thread within a Node-calibrated
   time bound (Low count / Light settle to stay connection-safe).

## Build process (timeout-resilient — user-mandated)

Subagent-driven development with the timeout-resilience protocol, applied with extra care because
this is the heaviest build in the family (3 settles per regenerate) and the session is long:

- **Incremental commits after every step**; each implementer writes `.superpowers/sdd/task-N-report.md`
  at task START and updates it as it goes, so a limit-killed subagent loses nothing.
- **Controller salvage:** a tiny result / "session limit" / API-connection-drop = killed subagent.
  Do NOT re-dispatch until reset; salvage committed work from git + working tree first; run the
  slow verify yourself (background Bash, connection-safe) if the implementer died mid-verify — as
  was done for Attrition's Task 8. CONTROLLER INLINE fallback with ledger attribution.
- **Verify runtime discipline:** never let a single verify exceed the connection-safe window. The
  engine port (Task 2) is testable at a fixed `ag` cheaply; the three-panel integration + soak
  (final task) must use Low count + Light settle with a Node-realistic bound, and may be run by the
  controller as a detached background command rather than inside a subagent.
- **Anti-overfit (binding):** transcribe brief code verbatim; if a test fails, report
  DONE_WITH_CONCERNS with measurements — never change production code or test thresholds/probes to
  force a pass, and NEVER flip an assertion direction to make a red test green. Any test asserting
  an erosion direction (more `ag` → less held) is physically required. NOTE: the panel *placement*
  invariant (`held[C] > held[L] > held[R]`) was deliberately changed once, as a user-approved
  design edit reordering which erosion level sits in which panel (`PANEL_AG_ORDER`) — that is a
  design change with its own approval, not overfitting a failing test.
- **Final review:** fresh independent subagent (most capable model), zero deference; run fast
  harnesses in full and slow ones via targeted probes.

## Infrastructure

- New git repo at `/Users/lukasz/genuary-2026/sketches/triptych`.
- Launch config `triptych`: `npx serve <dir> --listen 3466`, port 3466, added to
  `/Users/lukasz/claude/self-redaction/.claude/launch.json`.
- Read-only sources (never modify): `~/genuary-2026/sketches/attrition/*` (the engine to port +
  harness + CSS + export kit).
- GitHub publish deferred until the user asks.

## Lineage

The family's first multi-panel piece — a meta-composition over [[attrition-project]]'s
two-species contested field, arranging one shared ground as a temporal progression. Draws its
form from the religious triptych (dominant center, attending wings) and its content from the
Harold Fisk Mississippi-meander maps (a channel's history of erasing and rewriting itself).
Family: palimpsest, core-samples, second-reading, fold, watershed, interference, drift,
attrition, field-script.
