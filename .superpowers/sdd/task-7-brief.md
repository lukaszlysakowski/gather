### Task 7: README + full-pipeline integration + soak (timeout-resilient)

**Files:**
- Create: `README.md`
- Test: `.superpowers/sdd/task-7-verify.js`
- Modify: `index.js` only if a defect is found.

**Interfaces:**
- Consumes: everything.
- Produces: docs + an end-to-end control-effects + connection-safe multi-seed soak.

- [ ] **Step 1: Write README.md**

```markdown
# Triptych

One contested ground, three moments. A single [Attrition](https://github.com/lukaszlysakowski/attrition)
field — the same seed, the same shared curl terrain — rendered three times across the panels as
the same battle unfolding in time: LEFT the ground barely touched, CENTER the contest at its
height, RIGHT the ground overrun. Read left to right, it is a Harold Fisk river-meander map made
literal — the history of a channel that erased and rewrote itself — in the form of a religious
triptych: a dominant central image flanked by two attending wings.

One red line: a single continuous thread stitched from each panel's dominant frontier (its C=0
truce line) across the gutters. Because erosion grows left→right, the thread starts short and
simple and becomes long and tortured as it travels — the war intensifying along one unbroken
line.

## Running

Static files, no build step: serve the directory (`npx serve . --listen 3466`) and open
`index.html`.

## Performance

Each render runs **three** full Attrition two-species settles (one per panel), so it is the
heaviest piece in the family — a default triptych (Count Low, Settle Light) takes several seconds
per panel in the browser. Lower Settle, or expect the wait at higher Count.

## Controls

- **Field** — Scale · Strength (the shared curl terrain, identical across panels)
- **Populations** — Count · Balance · Seeding (identical across panels)
- **Progression** — Early / Rising / Late (the erosion triad: how far the three panels span from
  untouched to overrun)
- **Settle** — Off/Light/Full
- **Style** — Wobble (default Off)
- randomize / refresh / svg / png / png 4x · click canvas = new seed

## How it works

- One `rollField` rolls the shared curl terrain; the two-species engine then runs three times on
  it at three erosion levels (the Progression triad).
- Each panel's depositor streaklines are cut into voids wherever the eroders won (C ≤ 0); the
  panels are mapped into a center-dominant three-square layout.
- The red thread takes the single longest frontier chain from each panel and joins them across
  the gutters into one continuous line — the `% held` in the signature (`L C R`) quantifies the
  progression.

## Exports

Layered SVG pen passes (Borders / Streaks-light / Streaks-heavy / Thread / Signature) for
multi-pen plotting; PNG at 1x (3830×1690) and 4x (15320×6760).

## Family

[palimpsest](https://github.com/lukaszlysakowski/palimpsest) ·
[core-samples](https://github.com/lukaszlysakowski/core-samples) ·
[second-reading](https://github.com/lukaszlysakowski/second-reading) ·
[fold](https://github.com/lukaszlysakowski/fold) ·
[watershed](https://github.com/lukaszlysakowski/watershed) ·
[interference](https://github.com/lukaszlysakowski/interference) ·
[drift](https://github.com/lukaszlysakowski/drift) ·
[attrition](https://github.com/lukaszlysakowski/attrition) ·
[field-script](https://github.com/lukaszlysakowski/field-script)
```

- [ ] **Step 2: Write soak + integration script**

`.superpowers/sdd/task-7-verify.js` (boilerplate through `check`, then):

```javascript
function run(setup) {
    vm.runInContext(`
        ui.scale=1; ui.strength=1; ui.count=0; ui.balance=1; ui.seeding=0; ui.progression=1; ui.settle=1; ui.wobble=0;
        ${setup}
        regenerate(false);
        globalThis.__snap = {
            panels: state.panels.length,
            verts: state.panels.reduce((a,p)=>a+p.segments.reduce((b,s)=>b+s.pts.length,0),0),
            held: state.held.slice(),
            thread: state.thread.length
        };
    `, sandbox);
    return sandbox.__snap;
}

const base = run('state.masterSeed = 4242;');
check('base: 3 panels + thread populated', base.panels === 3 && base.thread >= 2);
check('base: substantial ink (>1500 vertices)', base.verts > 1500, `${base.verts}`);
check('base: held decreases L→R', base.held[0] > base.held[1] && base.held[1] > base.held[2], `${base.held.map(h=>h.toFixed(3)).join(' > ')}`);

// Progression widens the span: Late holds less on the right than Early does
const early = run('state.masterSeed = 4242; ui.progression = 0;');
const late = run('state.masterSeed = 4242; ui.progression = 2;');
check('Late right-panel holds less than Early right-panel', late.held[2] < early.held[2], `late ${late.held[2].toFixed(3)} vs early ${early.held[2].toFixed(3)}`);

// full-pipeline determinism
vm.runInContext('ui.scale=1;ui.strength=1;ui.count=0;ui.balance=1;ui.seeding=0;ui.progression=1;ui.settle=1;ui.wobble=0; state.masterSeed=4242; regenerate(false); globalThis.__d1 = JSON.stringify({h: state.held, t: state.thread.length, p: state.panels.map(p=>p.segments.length)});', sandbox);
vm.runInContext('state.masterSeed=4242; regenerate(false); globalThis.__d2 = JSON.stringify({h: state.held, t: state.thread.length, p: state.panels.map(p=>p.segments.length)});', sandbox);
check('full-pipeline determinism', sandbox.__d1 === sandbox.__d2);

// connection-safe multi-seed soak: 3 seeds, Low count + Light settle (each is 3 settles)
console.log('\nMulti-seed soak (Low/Light, 3 panels each):\n');
let allOK = true;
for (const seed of [17, 404, 9090]) {
    const t0 = Date.now();
    vm.runInContext(`ui.count=0; ui.progression=1; ui.settle=1; state.masterSeed=${seed}; regenerate(false);`, sandbox);
    const ms = Date.now() - t0;
    const s = sandbox.state;
    const verts = s.panels.reduce((a,p)=>a+p.segments.reduce((b,x)=>b+x.pts.length,0),0);
    const ok = s.panels.length === 3 && verts > 800 && s.thread.length >= 2 && ms < 180000;
    console.log(`  seed ${seed}: held ${s.held.map(h=>(h*100).toFixed(0)).join('/')}%, ${verts} verts, ${s.thread.length} thread pts, ${ms}ms ${ok ? 'ok' : 'FAIL'}`);
    if (!ok) allOK = false;
}
check('3-seed soak at Low/Light', allOK);

const svg = vm.runInContext('buildSVG()', sandbox);
check('soak SVG has 5 passes', (svg.match(/inkscape:groupmode="layer"/g) || []).length === 5);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Run soak (timeout-resilient)**

This is the heaviest verify (many 3-panel regenerates). Commit the README + verify script FIRST, then run. If it would exceed the connection-safe window, the CONTROLLER runs it as a detached background Bash command and reads the result (as done for Attrition Task 8).

Run: `node .superpowers/sdd/task-7-verify.js`
Expected: `7 passed, 0 failed`; each soak seed well under 180s.

If `base: held decreases L→R` or `Late ... holds less than Early` fails, the fix is in the engine/orchestration tasks, not the threshold — report which, do NOT weaken or flip.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Task 7: README + full-pipeline integration + multi-seed soak"
```

---

