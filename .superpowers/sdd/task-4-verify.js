const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { installP5Stub } = require('./p5-stub.js');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'index.js'), 'utf8');
const sandbox = Object.assign({}, installP5Stub(), {
    console,
    localStorage: { getItem: () => null, setItem: () => {} },
    fetch: () => ({ catch: () => {} }),
    confirm: () => false,
    document: { getElementById: () => null, createElement: () => ({ click: () => {} }) },
    Blob: function () {}, URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
    window: {}
});
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(SRC, sandbox);
// const-declared globals are not sandbox properties — export explicitly for direct reads.
vm.runInContext('globalThis.state = state; globalThis.ui = ui; globalThis.TW = TW; globalThis.TH = TH; globalThis.PANELS = PANELS; globalThis.panelMap = panelMap; renderAll = function () {};', sandbox);

let pass = 0, fail = 0;
function check(name, cond, detail) {
    if (cond) { pass++; console.log(`  ok  ${name}`); }
    else { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

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
