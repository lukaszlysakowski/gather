### Task 6: Export — SVG pen passes + PNG

**Files:**
- Modify: `index.js` (replace `exportSVG`/`exportPNG` stubs; add `polyToPath`, `svgPass`, `buildSVG`)
- Test: `.superpowers/sdd/task-6-verify.js`

**Interfaces:**
- Consumes: `state.panels`, `state.thread`, `PANELS`, `panelMap`, `wobblePts`, `signatureText`.
- Produces: `buildSVG() → string` (5 passes: Borders, Streaks-light, Streaks-heavy, Thread, Signature; M/L-only; red only in Thread); `exportSVG()` downloads; `exportPNG(scale)` re-renders + saves.

- [ ] **Step 1: Implement**

```javascript
function polyToPath(pts) {
    const w = wobblePts(pts);
    let d = `M ${w[0].x.toFixed(2)} ${w[0].y.toFixed(2)}`;
    for (let i = 1; i < w.length; i++) d += ` L ${w[i].x.toFixed(2)} ${w[i].y.toFixed(2)}`;
    return d;
}

function svgPass(label, color, weight, paths) {
    if (!paths.length) return '';
    let s = `  <g id="${label}" inkscape:groupmode="layer" inkscape:label="${label}" ` +
        `stroke="${color}" stroke-width="${weight}" fill="none" stroke-linecap="round" stroke-linejoin="round">\n`;
    for (const d of paths) s += `    <path d="${d}"/>\n`;
    s += '  </g>\n';
    return s;
}

function buildSVG() {
    const light = [], heavy = [];
    for (let i = 0; i < 3; i++) {
        const rect = PANELS[i];
        for (const s of state.panels[i].segments) {
            const d = polyToPath(s.pts.map(p => panelMap(p, rect)));
            (s.cls === 1 ? heavy : light).push(d);
        }
    }
    const threadPaths = state.thread.length >= 2 ? [polyToPath(state.thread)] : [];
    const borderPaths = PANELS.map(r => `M ${r.x0} ${r.y0} L ${r.x0 + r.s} ${r.y0} L ${r.x0 + r.s} ${r.y0 + r.s} L ${r.x0} ${r.y0 + r.s} L ${r.x0} ${r.y0}`);
    let s = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ` +
        `width="${TW}" height="${TH}" viewBox="0 0 ${TW} ${TH}">\n`;
    s += `  <rect width="${TW}" height="${TH}" fill="${PAPER}"/>\n`;
    s += svgPass('Borders', INK, 0.9, borderPaths);
    s += svgPass('Streaks-light', INK, 0.4, light);
    s += svgPass('Streaks-heavy', INK, 0.8, heavy);
    s += svgPass('Thread', RED, 1.7, threadPaths);
    s += `  <g id="Signature" inkscape:groupmode="layer" inkscape:label="Signature">\n` +
        `    <text x="${P}" y="${TH - P + 40}" font-family="monospace" font-size="24" fill="${INK}">${signatureText()}</text>\n  </g>\n`;
    s += '</svg>\n';
    return s;
}

function exportSVG() {
    const blob = new Blob([buildSVG()], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `triptych-seed${state.masterSeed}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
}

function exportPNG(scale) {
    pixelDensity(scale);
    renderAll();
    saveCanvas(`triptych-seed${state.masterSeed}-${scale}x`, 'png');
    pixelDensity(1);
    renderAll();
}
```

- [ ] **Step 2: Write verify script**

`.superpowers/sdd/task-6-verify.js` (boilerplate through `check`, then):

```javascript
vm.runInContext('ui.scale=1; ui.strength=1; ui.count=0; ui.balance=1; ui.seeding=0; ui.progression=1; ui.settle=1; ui.wobble=0; state.masterSeed=4242; regenerate(false);', sandbox);
const svg = vm.runInContext('buildSVG()', sandbox);

const labels = ['Borders', 'Streaks-light', 'Streaks-heavy', 'Thread', 'Signature'];
for (const l of labels) check(`pass present: ${l}`, svg.includes(`inkscape:label="${l}"`));
check('exactly 5 layer groups', (svg.match(/inkscape:groupmode="layer"/g) || []).length === 5);

// red only in Thread (reference the RED constant)
const redHex = vm.runInContext('RED', sandbox);
const groups = svg.split('<g ').slice(1);
let redOK = true;
for (const g of groups) if (g.includes(redHex) && !g.startsWith('id="Thread"')) redOK = false;
check('red only in Thread', redOK);

// Borders pass has exactly 3 paths (the three frames)
const borderGroup = groups.find(g => g.startsWith('id="Borders"')) || '';
check('Borders pass has 3 rects', (borderGroup.match(/<path /g) || []).length === 3);

const ds = [...svg.matchAll(/ d="([^"]+)"/g)].map(m => m[1]);
check('paths exist', ds.length > 5, `${ds.length}`);
check('M/L-only paths', ds.every(d => /^M( -?\d+(\.\d+)?){2}( L( -?\d+(\.\d+)?){2})+$/.test(d.replace(/ +/g, ' '))));
check('viewBox correct', svg.includes('viewBox="0 0 3830 1690"'));
check('signature shows three held values', /Triptych · seed 4242 · \d+ \d+ \d+% held/.test(svg));

vm.runInContext('ui.wobble = 1;', sandbox);
const w1 = vm.runInContext('buildSVG()', sandbox);
const w2 = vm.runInContext('buildSVG()', sandbox);
check('wobble deterministic across builds', w1 === w2);
check('wobble changes geometry', w1 !== svg);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Run verify**

Run: `node .superpowers/sdd/task-6-verify.js`
Expected: `13 passed, 0 failed` (one 3-panel regenerate + string checks)

Note: if `saveCanvas`/`pixelDensity` are missing from the p5-stub, add no-ops to the SANDBOX object in the verify, not the stub file.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Task 6: SVG pen passes + PNG/PNG-4x export"
```

---

