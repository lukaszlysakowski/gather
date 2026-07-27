### Task 3: Three-panel orchestration — one shared field, three erosions

**Files:**
- Modify: `index.js` (replace `runPanels` stub)
- Test: `.superpowers/sdd/task-3-verify.js`

**Interfaces:**
- Consumes: `rollField` (Task 2, runs once in `regenerate`), `runWaves`/`buildRender` (Task 2), `PROGRESSIONS`, `ui.progression`, `state`.
- Produces: `runPanels()` — for each of the three ag values in the selected Progression triad, sets `state.activeAg`, runs `runWaves()` + `buildRender()`, and captures a deep copy of the panel output into `state.panels[i] = {segments, frontier, heldFrac}` (field coords) and `state.held[i] = heldFrac`. `rollField` is NOT called here (it already ran once in `regenerate` — the shared field).

- [ ] **Step 1: Implement**

```javascript
function runPanels() {
    const triad = PROGRESSIONS[CONTROL_DEFS.find(d => d.key === 'progression').opts[ui.progression]];
    state.panels = [];
    state.held = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
        state.activeAg = triad[i];
        runWaves();       // reads state.field (shared) + state.activeAg; fills state.D/E, state.paths
        buildRender();    // fills state.segments, state.frontier, state.heldFrac (field coords)
        // capture this panel's outputs (the scratch fields are overwritten by the next run)
        state.panels.push({
            segments: state.segments.map(s => ({ cls: s.cls, pts: s.pts.map(p => ({ x: p.x, y: p.y })) })),
            frontier: state.frontier.map(pl => pl.map(p => ({ x: p.x, y: p.y }))),
            heldFrac: state.heldFrac
        });
        state.held[i] = state.heldFrac;
    }
}
```

Note: `runWaves` calls `gridsReset()` at its start (Attrition does), so each panel begins from clean grids on the SAME shared `state.field`. The deep copy is required because `state.segments`/`state.frontier` are overwritten by the next panel's `buildRender`.

- [ ] **Step 2: Write verify script**

`.superpowers/sdd/task-3-verify.js` (boilerplate through `check`, then):

```javascript
vm.runInContext('ui.scale=1; ui.strength=1; ui.count=0; ui.balance=1; ui.seeding=0; ui.progression=1; ui.settle=1; state.masterSeed=4242; regenerate(false);', sandbox);
const st = sandbox.state;

check('three panels captured', st.panels.length === 3);
check('each panel has segments + frontier arrays', st.panels.every(p => Array.isArray(p.segments) && Array.isArray(p.frontier)));
check('held has 3 values', st.held.length === 3 && st.held.every(h => h >= 0 && h <= 1));

// THE PROGRESSION: more erosion (L→R) holds strictly less ground. Physically required.
check('held strictly decreases L→C→R', st.held[0] > st.held[1] && st.held[1] > st.held[2], `${st.held.map(h=>h.toFixed(3)).join(' > ')}`);

// shared field: all three panels rolled from ONE field (rollField ran once). Assert the field
// params object identity did not change across the run (rollField not re-called in runPanels).
const oneField = vm.runInContext(`
    (function(){
        state.masterSeed = 707; randomSeed(707);
        rollField();
        const before = JSON.stringify({ns: state.field.ns, ox: state.field.ox, oy: state.field.oy});
        runPanels();
        const after = JSON.stringify({ns: state.field.ns, ox: state.field.ox, oy: state.field.oy});
        return before === after;
    })()
`, sandbox);
check('shared field unchanged across the 3 panel runs', oneField);

// progression triad monotonic for a second seed too
vm.runInContext('state.masterSeed=98765; regenerate(false);', sandbox);
check('held decreases L→R (2nd seed)', sandbox.state.held[0] > sandbox.state.held[1] && sandbox.state.held[1] > sandbox.state.held[2], `${sandbox.state.held.map(h=>h.toFixed(3)).join(' > ')}`);

// determinism
vm.runInContext('state.masterSeed=55; regenerate(false); globalThis.__a = JSON.stringify(state.held) + state.panels.map(p=>p.segments.length).join(",");', sandbox);
vm.runInContext('state.masterSeed=55; regenerate(false); globalThis.__b = JSON.stringify(state.held) + state.panels.map(p=>p.segments.length).join(",");', sandbox);
check('determinism: held + panel segment counts', sandbox.__a === sandbox.__b);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

If `held strictly decreases L→C→R` fails, do NOT weaken it — report it; it points to the ag triad or the erosion dynamics, a real signal. (A tie at the top is possible only if `agL` is large enough to already saturate; the Rising default `[0.3,0.6,1.0]` should give a clear gradient.)

- [ ] **Step 3: Run verify**

Run: `node .superpowers/sdd/task-3-verify.js`
Expected: `7 passed, 0 failed` (SLOW — several 3-panel regenerates; be patient, may take many minutes; if it runs long, commit first and run the verify separately)

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Task 3: three-panel orchestration — shared field, three erosions"
```

---

