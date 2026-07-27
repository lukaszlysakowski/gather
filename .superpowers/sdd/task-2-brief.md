### Task 2: Port Attrition's engine (verbatim, erosion via state.activeAg)

**Files:**
- Modify: `index.js` (replace `rollField` stub; add the whole Attrition engine)
- Test: `.superpowers/sdd/task-2-verify.js`

**Interfaces:**
- Consumes: `ui`, `state`, `FS`/`FPAD`/`GRID_N`, p5 `random/randomSeed`, `seededRng`.
- Produces: the full Attrition engine operating on `state` scratch fields — `makeNoise2D`, `potential`, `baseField`, `pageToGrid`, `gridsReset`, `splat`, `smoothGrid`, `gridNorm`, `sampleBilinear`, `Cat`, `DhatAt`, `CposHatAt`, `gridGrad`, `depBentField`, `eroBentField`, `inRegion`, `waveStarts`, `advect`, `runWaves`, `cullPath`, `samplePt`, `marchCell`, `chainSegments`, `chaikin`, `marchLevelC`, `buildRender`, plus constants `FLOW_SPEED/CURL_H/DEP_AMOUNT/ERODE_AMOUNT/SLOW/DIVERT/SLOW_FLOOR/HUNT/DT/MAX_STEPS/STALL_EPS/SETTLE_EPS/MIN_PTS/HEAVY_THRESH/EROSION_EPS`. `runWaves()` reads `state.activeAg` for erosion; `buildRender()` fills `state.segments/frontier/heldFrac` in field coords. `state.frontier` is an array of polylines (chains) — needed whole by Task 5 (do NOT reduce it here).

- [ ] **Step 1: Copy the engine block verbatim from the read-only source**

Open `/Users/lukasz/genuary-2026/sketches/attrition/index.js` (READ ONLY — do not modify it). Copy **every engine function and constant** from it into `triptych/index.js`, replacing the `function rollField() {}` stub and inserting the rest in the same order Attrition defines them. The functions/constants to copy are exactly those named in the Interfaces "Produces" list above. Attrition's `index.js` defines them between its `rollField` and its `exportSVG`; copy that entire span verbatim.

Two mechanical renames while copying, because Triptych uses `FS`/`FPAD` where Attrition uses `CS`/`PAD` for the FIELD space (Triptych's `CS`/`PAD` names are taken by the triptych canvas — but note Attrition's engine uses the names `CS` and `PAD`):
- Attrition's engine references `CS` (=2170) and `PAD` (=87) as the FIELD dimensions. In Triptych those field dimensions are named `FS` and `FPAD`. So while copying, replace every standalone `CS` with `FS` and every standalone `PAD` with `FPAD` **inside the copied engine functions only** (e.g. `pageToGrid`, `samplePt`, `inRegion`, `waveStarts`, `gridGrad`, `cullPath`'s band math, `buildRender`). Do a careful search: the engine uses `CS - 2 * PAD`, `CS - PAD`, `PAD + ...`, `x <= CS - PAD`, etc. — all become `FS`/`FPAD`. (Confirm by grep afterward: `grep -n '\bCS\b\|\bPAD\b' index.js` should show CS/PAD ONLY in the triptych-layout/scaffold region, never inside engine functions.)

- [ ] **Step 2: Apply the ONE engine edit — erosion via `state.activeAg`**

In the copied engine, erosion currently reads the Attrition control index. Change exactly these two reads to `state.activeAg`:

1. In `eroBentField(x, y)`: replace
   ```javascript
   const ag = EROSION_AG[ui.erosion];
   ```
   with
   ```javascript
   const ag = state.activeAg;
   ```
2. In `runWaves()`: replace
   ```javascript
   const ag = EROSION_AG[ui.erosion];
   ```
   with
   ```javascript
   const ag = state.activeAg;
   ```
   (Everything else in `runWaves` — `Pe = ag === 0 ? 0 : total - Pd`, the `ag * ERODE_AMOUNT` splat, the settle loop — stays verbatim; it already uses the local `ag`.)

There is no `EROSION_AG` constant in Triptych, so these two edits remove the only references to it. Confirm afterward: `grep -n 'EROSION_AG' index.js` returns nothing.

Also: Attrition's `runWaves` reads `WAVE_CAP[ui.settle]`, `COUNTS[ui.count]`, `BALANCE[ui.balance]` — Triptych's `ui` has `settle`, `count`, `balance` with the SAME option arrays, but the CONSTANT arrays `WAVE_CAP`, `COUNTS`, `BALANCE` must exist. Add them near the engine constants (verbatim from Attrition):
```javascript
const COUNTS = [800, 1600, 2600];
const BALANCE = [0.4, 0.55, 0.7];
const WAVE_CAP = [1, 6, 14];
```
(These were in Attrition's Task-1 scaffold; Triptych's scaffold omitted them because they belong with the engine. `EROSION_AG` is intentionally NOT added.)

- [ ] **Step 3: Grep gate — confirm the rename is complete before writing/running the verify**

Run `grep -n 'EROSION_AG' index.js` (expect NO output) and `grep -n '\bCS\b\|\bPAD\b' index.js` (expect matches ONLY in the triptych-layout/scaffold region — `SC/SW/TW/TH/PANELS/P` are fine, but bare `CS`/`PAD` must NOT appear inside any engine function: `pageToGrid`, `inRegion`, `waveStarts`, `cullPath`, `samplePt`, `gridGrad`, `buildRender`, etc.). If any engine function still references `CS`/`PAD`, finish the `FS`/`FPAD` rename before proceeding.

- [ ] **Step 4: Write verify script — the port behaves identically to Attrition at a fixed ag**

`.superpowers/sdd/task-2-verify.js` (boilerplate through `check` — copy from task-1-verify.js top through the globals-export line, then):

```javascript
// Drive one panel-equivalent run by setting state.activeAg directly (the orchestrator will do
// this in Task 3). rollField() rolls the shared field; then a single runWaves()/buildRender().
function runAt(ag, seed, setup) {
    vm.runInContext(`
        ui.scale=1; ui.strength=1; ui.count=0; ui.balance=1; ui.seeding=0; ui.settle=1;
        ${setup || ''}
        randomSeed(${seed}); state.masterSeed=${seed};
        rollField();
        state.activeAg = ${ag};
        runWaves(); buildRender();
        globalThis.__o = { segs: state.segments.length, frontier: state.frontier.length, held: state.heldFrac, eSum: (function(){let s=0;for(let i=0;i<state.E.length;i++)s+=state.E[i];return s;})() };
    `, sandbox);
    return sandbox.__o;
}

// ag=0 → Attrition's Off baseline: no eroders, E all zero, no frontier, held near 1
const off = runAt(0, 4242);
check('ag=0 → E all zero (no eroders)', off.eSum === 0, `${off.eSum}`);
check('ag=0 → no frontier', off.frontier === 0, `${off.frontier}`);
check('ag=0 → held ground in (0,1)', off.held > 0 && off.held < 1, `${off.held}`);

// larger ag → less held ground (monotone) — physically required, do NOT weaken
const gentle = runAt(0.6, 4242);
const fierce = runAt(1.0, 4242);
check('ag: fierce holds less than gentle holds less than off', fierce.held < gentle.held && gentle.held < off.held, `off ${off.held.toFixed(3)} gentle ${gentle.held.toFixed(3)} fierce ${fierce.held.toFixed(3)}`);
check('ag=1.0 → frontier + segments exist', fierce.frontier > 0 && fierce.segs > 0, `${fierce.frontier}/${fierce.segs}`);

// determinism at fixed ag
const a = runAt(0.6, 55), b = runAt(0.6, 55);
check('determinism at fixed ag', a.segs === b.segs && a.frontier === b.frontier && Math.abs(a.held - b.held) < 1e-12);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 5: Run verify**

Run: `node .superpowers/sdd/task-2-verify.js`
Expected: `6 passed, 0 failed` (each `runAt` is one settle at Low count — a few of these; be patient, budget a few minutes)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Task 2: port Attrition engine verbatim (erosion via state.activeAg)"
```

---

