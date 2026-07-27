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

// Task 3 specific checks
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
