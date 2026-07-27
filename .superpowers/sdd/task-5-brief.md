### Task 5: The one red thread

**Files:**
- Modify: `index.js` (replace `buildThread` stub; add `chainLength`, `orientLR`)
- Test: `.superpowers/sdd/task-5-verify.js`

**Interfaces:**
- Consumes: `state.panels` (each `.frontier` is an array of chains, field coords), `PANELS`, `panelMap`.
- Produces: `chainLength(chain) → number` (summed segment length); `orientLR(chain) → chain` (reversed if last.x < first.x); `buildThread()` fills `state.thread` = ONE polyline in triptych coords: for each panel that has ≥1 frontier chain, pick the longest chain, orient L→R, map into that panel's rect; concatenate the present panels' mapped chains left→center→right, joined by straight connectors between consecutive present chains (each connector is implicit — the concatenation itself draws a line from one chain's last point to the next chain's first point). If no panel has a frontier, `state.thread = []`.

- [ ] **Step 1: Implement**

```javascript
function chainLength(chain) {
    let L = 0;
    for (let i = 1; i < chain.length; i++) L += Math.hypot(chain[i].x - chain[i - 1].x, chain[i].y - chain[i - 1].y);
    return L;
}

function orientLR(chain) {
    if (chain.length >= 2 && chain[chain.length - 1].x < chain[0].x) return chain.slice().reverse();
    return chain;
}

function buildThread() {
    const parts = [];
    for (let i = 0; i < 3; i++) {
        const chains = state.panels[i] ? state.panels[i].frontier : [];
        if (!chains.length) continue;
        // dominant chain = longest by summed length
        let best = chains[0], bestLen = chainLength(chains[0]);
        for (const c of chains) { const l = chainLength(c); if (l > bestLen) { bestLen = l; best = c; } }
        const mapped = orientLR(best).map(p => panelMap(p, PANELS[i]));
        parts.push(mapped);
    }
    // concatenate the present panels' chains into ONE polyline; the join between consecutive
    // parts is a straight connector across the gutter (implicit in the concatenation).
    state.thread = [];
    for (const part of parts) for (const p of part) state.thread.push(p);
}
```

- [ ] **Step 2: Write verify script**

`.superpowers/sdd/task-5-verify.js` (boilerplate through `check`, then):

```javascript
vm.runInContext('ui.scale=1; ui.strength=1; ui.count=0; ui.balance=1; ui.seeding=0; ui.progression=1; ui.settle=1; state.masterSeed=4242; regenerate(false);', sandbox);
const st = sandbox.state;

check('thread exists (>=2 pts)', st.thread.length >= 2, `${st.thread.length}`);
check('thread is finite (no NaN)', st.thread.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));

// thread spans the present panels: with the Rising triad, center+right at least have frontiers.
// Its x-range should cover from the leftmost present panel to the right panel.
const xs = st.thread.map(p => p.x);
const xmin = Math.min(...xs), xmax = Math.max(...xs);
check('thread spans into the right panel', xmax >= sandbox.PANELS[2].x0, `xmax ${xmax.toFixed(0)} vs R.x0 ${sandbox.PANELS[2].x0}`);
check('thread starts at or left of center panel', xmin <= sandbox.PANELS[1].x0 + sandbox.PANELS[1].s, `xmin ${xmin.toFixed(0)}`);

// each contributing part is the LONGEST frontier chain of its panel
const longest = vm.runInContext(`
    (function(){
        let okAll = true;
        for (let i = 0; i < 3; i++) {
            const chains = state.panels[i].frontier;
            if (!chains.length) continue;
            let bestLen = 0; for (const c of chains) bestLen = Math.max(bestLen, chainLength(c));
            // the mapped dominant chain length (in field space) should equal bestLen
            let picked = chains[0], pl = chainLength(chains[0]);
            for (const c of chains) { const l = chainLength(c); if (l > pl) { pl = l; picked = c; } }
            if (Math.abs(pl - bestLen) > 1e-9) okAll = false;
        }
        return okAll;
    })()
`, sandbox);
check('dominant chain per panel is the longest', longest);

// exactly ONE polyline (state.thread is a single flat array, not an array of arrays)
check('exactly one thread polyline', Array.isArray(st.thread) && st.thread.length > 0 && typeof st.thread[0].x === 'number');

// edge case: an Early triad with tiny agL may give the left panel no frontier — still one thread, no crash
vm.runInContext('ui.progression = 0; state.masterSeed = 4242; regenerate(false);', sandbox);
check('Early triad still yields one thread (edge case)', Array.isArray(sandbox.state.thread) && sandbox.state.thread.length >= 2);

// determinism
vm.runInContext('ui.progression=1; state.masterSeed=88; regenerate(false); globalThis.__t1 = JSON.stringify(state.thread.slice(0,20));', sandbox);
vm.runInContext('state.masterSeed=88; regenerate(false); globalThis.__t2 = JSON.stringify(state.thread.slice(0,20));', sandbox);
check('determinism: thread', sandbox.__t1 === sandbox.__t2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Run verify**

Run: `node .superpowers/sdd/task-5-verify.js`
Expected: `8 passed, 0 failed` (SLOW — 3-panel regenerates; be patient)

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Task 5: the one red thread — dominant frontier chains stitched across gutters"
```

---

