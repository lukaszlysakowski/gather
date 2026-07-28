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

// Task 6 specific checks
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
check('signature shows three held values', /Gather · seed 4242 · \d+ \d+ \d+% held/.test(svg));

vm.runInContext('ui.wobble = 1;', sandbox);
const w1 = vm.runInContext('buildSVG()', sandbox);
const w2 = vm.runInContext('buildSVG()', sandbox);
check('wobble deterministic across builds', w1 === w2);
check('wobble changes geometry', w1 !== svg);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
