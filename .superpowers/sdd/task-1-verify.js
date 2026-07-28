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

check('canvas TW=3830, TH=1690', sandbox.TW === 3830 && sandbox.TH === 1690, `${sandbox.TW}x${sandbox.TH}`);
check('3 panels', sandbox.PANELS.length === 3);
check('center is largest + wings centered', sandbox.PANELS[1].s === 1500 && sandbox.PANELS[0].s === 1000 && sandbox.PANELS[0].y0 === 345 && sandbox.PANELS[2].y0 === 345);
check('center vertically spans full height inside pad', sandbox.PANELS[1].y0 === 95);
check('ui defaults', sandbox.ui.progression === 1 && sandbox.ui.count === 0 && sandbox.ui.settle === 1 && sandbox.ui.wobble === 0);
vm.runInContext('state.masterSeed = 123; regenerate(false);', sandbox);
check('regenerate(false) keeps seed', sandbox.state.masterSeed === 123);
// panelMap: field corners map to panel-rect corners
const corners = vm.runInContext(`
    (function(){
        const tl = panelMap({x: 87, y: 87}, PANELS[1]);
        const br = panelMap({x: 2170 - 87, y: 2170 - 87}, PANELS[1]);
        return [tl, br];
    })()
`, sandbox);
check('panelMap corners → center rect', Math.abs(corners[0].x - 1165) < 1e-6 && Math.abs(corners[0].y - 95) < 1e-6 && Math.abs(corners[1].x - (1165 + 1500)) < 1e-6, JSON.stringify(corners));
const sig = vm.runInContext('signatureText()', sandbox);
check('signature format', /^Gather · seed 123 · \d{4}-\d{2}-\d{2}$/.test(sig), sig);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
