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
vm.runInContext('globalThis.state = state; globalThis.ui = ui; globalThis.TW = TW; globalThis.TH = TH; globalThis.PANELS = PANELS; globalThis.regenerate = regenerate; globalThis.buildSVG = buildSVG; globalThis.signatureText = signatureText; globalThis.panelMap = panelMap; renderAll = function () {};', sandbox);

let pass = 0, fail = 0;
function check(name, cond, detail) {
    if (cond) { pass++; console.log(`  ok  ${name}`); }
    else { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

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
check('base: held center densest, then left, then right', base.held[1] > base.held[0] && base.held[0] > base.held[2], `C ${base.held[1].toFixed(3)} > L ${base.held[0].toFixed(3)} > R ${base.held[2].toFixed(3)}`);

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
    const ok = s.panels.length === 3 && verts > 800 && s.thread.length >= 2 && ms < 240000;
    console.log(`  seed ${seed}: held ${s.held.map(h=>(h*100).toFixed(0)).join('/')}%, ${verts} verts, ${s.thread.length} thread pts, ${ms}ms ${ok ? 'ok' : 'FAIL'}`);
    if (!ok) allOK = false;
}
check('3-seed soak at Low/Light', allOK);

const svg = vm.runInContext('buildSVG()', sandbox);
check('soak SVG has 5 passes', (svg.match(/inkscape:groupmode="layer"/g) || []).length === 5);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
