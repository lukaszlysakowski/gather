### Task 4: Layout mapping check (panelMap integration)

`panelMap` was defined in Task 1; this task adds a focused test that mapped geometry lands in the right rects with no overlap. No new production code unless a defect surfaces.

**Files:**
- Test: `.superpowers/sdd/task-4-verify.js`
- Modify: `index.js` only if a defect is found.

**Interfaces:**
- Consumes: `panelMap`, `PANELS`, `state.panels` (Task 3).
- Produces: confidence that per-panel geometry maps into non-overlapping, correctly-placed rects.

- [ ] **Step 1: Write verify script**

`.superpowers/sdd/task-4-verify.js` (boilerplate through `check`, then):

```javascript
vm.runInContext('ui.scale=1; ui.strength=1; ui.count=0; ui.balance=1; ui.seeding=0; ui.progression=1; ui.settle=1; state.masterSeed=4242; regenerate(false);', sandbox);

// rects: non-overlapping, wings centered, center largest
const P = sandbox.PANELS;
check('rects non-overlapping (L right edge < C left edge < ... )',
    P[0].x0 + P[0].s < P[1].x0 && P[1].x0 + P[1].s < P[2].x0,
    `L.r ${P[0].x0+P[0].s} C.l ${P[1].x0} C.r ${P[1].x0+P[1].s} R.l ${P[2].x0}`);
check('wings vertically centered on center midline',
    Math.abs((P[0].y0 + P[0].s/2) - (P[1].y0 + P[1].s/2)) < 1e-6 &&
    Math.abs((P[2].y0 + P[2].s/2) - (P[1].y0 + P[1].s/2)) < 1e-6);

// every mapped segment vertex lands within its panel rect (± small overshoot for Attrition's edge exits)
const within = vm.runInContext(`
    (function(){
        let bad = 0, checked = 0;
        for (let i = 0; i < 3; i++) {
            const rect = PANELS[i], span = 2170 - 174, m = rect.s / span, tol = 35 * m + 1;
            for (const s of state.panels[i].segments) for (const v of s.pts) {
                const p = panelMap(v, rect); checked++;
                if (p.x < rect.x0 - tol || p.x > rect.x0 + rect.s + tol || p.y < rect.y0 - tol || p.y > rect.y0 + rect.s + tol) bad++;
            }
        }
        return [bad, checked];
    })()
`, sandbox);
check('mapped segment vertices within panel rects (±overshoot)', within[0] === 0, `${within[0]}/${within[1]} outside`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run verify**

Run: `node .superpowers/sdd/task-4-verify.js`
Expected: `3 passed, 0 failed`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "Task 4: layout mapping verification (panelMap into non-overlapping rects)"
```

---

