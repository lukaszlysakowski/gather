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
vm.runInContext('globalThis.state = state; globalThis.ui = ui; globalThis.TW = TW; globalThis.TH = TH; globalThis.PANELS = PANELS; renderAll = function () {};', sandbox);

let pass = 0, fail = 0;
function check(name, cond, detail) {
    if (cond) { pass++; console.log(`  ok  ${name}`); }
    else { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

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
