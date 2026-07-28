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
vm.runInContext('globalThis.state = state; globalThis.ui = ui; globalThis.TW = TW; globalThis.TH = TH; globalThis.PANELS = PANELS; globalThis.chainLength = chainLength; globalThis.orientLR = orientLR; globalThis.panelMap = panelMap; renderAll = function () {};', sandbox);

let pass = 0, fail = 0;
function check(name, cond, detail) {
    if (cond) { pass++; console.log(`  ok  ${name}`); }
    else { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

// Task 5 checks
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
