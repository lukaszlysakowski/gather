// Triptych — one contested ground, three moments. A meta-composition over Attrition.
// Family: palimpsest / core-samples / second-reading / fold / watershed / interference / drift / attrition.

// --- field-coordinate space (Attrition's native, per panel) ---
const FS = 2170;
const FPAD = Math.round(FS * 0.04);
const GRID_N = 300;

// --- triptych layout ---
const SC = 1500, SW = 1000, G = 70, P = 95;
const TW = P + SW + G + SC + G + SW + P;   // 3830
const TH = P + SC + P;                       // 1690
const WING_Y = P + (SC - SW) / 2;            // 345 — wings vertically centered
const PANELS = [
    { x0: P, y0: WING_Y, s: SW },                    // LEFT
    { x0: P + SW + G, y0: P, s: SC },                // CENTER
    { x0: P + SW + G + SC + G, y0: WING_Y, s: SW }   // RIGHT
];

const PAPER = '#F7E6D4';
const INK = '#1A1613';
const RED = '#A93B2A';

// Progression triads: erosion aggression [left, center, right], strictly increasing.
const PROGRESSIONS = {
    Early: [0.15, 0.35, 0.70],
    Rising: [0.30, 0.60, 1.00],
    Late: [0.60, 1.00, 1.40]
};

const CONTROL_DEFS = [
    { key: 'scale',       label: 'Scale',       opts: ['Fine', 'Med', 'Broad'],                    def: 1 },
    { key: 'strength',    label: 'Strength',    opts: ['Low', 'Med', 'High'],                      def: 1 },
    { key: 'count',       label: 'Count',       opts: ['Low', 'Med', 'High'],                      def: 0 },
    { key: 'balance',     label: 'Balance',     opts: ['More-eroders', 'Even', 'More-depositors'], def: 1 },
    { key: 'seeding',     label: 'Seeding',     opts: ['Scattered', 'Edge', 'Clustered'],          def: 0 },
    { key: 'progression', label: 'Progression', opts: ['Early', 'Rising', 'Late'],                 def: 1 },
    { key: 'settle',      label: 'Settle',      opts: ['Off', 'Light', 'Full'],                    def: 1 },
    { key: 'wobble',      label: 'Wobble',      opts: ['Off', 'On'],                               def: 0 }
];

const ui = { scale: 1, strength: 1, count: 0, balance: 1, seeding: 0, progression: 1, settle: 1, wobble: 0 };

const state = {
    masterSeed: 1,
    field: null,          // shared rolled potential params (rollField, once)
    activeAg: 0,          // erosion aggression for the panel currently running
    D: null, E: null, Dmax: 1, CposMax: 1,   // per-panel scratch grids (Attrition)
    segments: [], frontier: [], heldFrac: 0, // per-panel scratch outputs (Attrition buildRender)
    panels: [],           // [{segments, frontier, heldFrac}] x3, field coords
    held: [0, 0, 0],      // heldFrac per panel
    thread: []            // ONE red polyline in triptych coords
};

const ctrlButtons = {};

// --- pipeline hooks (filled by later tasks) ---
function rollField() {}
function runPanels() {}
function buildThread() {}

function regenerate(newSeed) {
    if (newSeed) state.masterSeed = Math.floor(Math.random() * 1e9);
    randomSeed(state.masterSeed);
    rollField();
    runPanels();
    buildThread();
    renderAll();
}

// mulberry32 — per-wave/species deterministic RNG, independent of p5's RNG.
function seededRng(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function wobblePts(pts) {
    if (!ui.wobble) return pts;
    randomSeed(pts[0].x * 0.01 + 50);
    return pts.map(p => ({ x: p.x + random(-1.2, 1.2), y: p.y + random(-1.2, 1.2) }));
}

function drawPoly(pts) {
    const w = wobblePts(pts);
    beginShape();
    for (const p of w) vertex(p.x, p.y);
    endShape();
}

// map a field-space point into a panel rect (uniform square scale)
function panelMap(pt, rect) {
    const span = FS - 2 * FPAD;
    const u = (pt.x - FPAD) / span, v = (pt.y - FPAD) / span;
    return { x: rect.x0 + u * rect.s, y: rect.y0 + v * rect.s };
}

function signatureText() {
    const d = new Date();
    const p2 = n => String(n).padStart(2, '0');
    const h = state.held.map(f => Math.round(100 * f));
    return `Triptych · seed ${state.masterSeed} · ${h[0]} ${h[1]} ${h[2]}% held  ` +
        `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

function renderAll() {
    background(PAPER);
    noFill();
    // per-panel ink streaks (light then heavy), mapped into each rect
    for (let i = 0; i < state.panels.length; i++) {
        const rect = PANELS[i], segs = state.panels[i].segments;
        stroke(INK);
        strokeWeight(0.8);
        for (const s of segs) if (s.cls === 0) drawPoly(s.pts.map(pt => panelMap(pt, rect)));
        strokeWeight(1.4);
        for (const s of segs) if (s.cls === 1) drawPoly(s.pts.map(pt => panelMap(pt, rect)));
    }
    // the one red thread (already in triptych coords)
    if (state.thread.length >= 2) {
        stroke(RED);
        strokeWeight(3.2);
        drawPoly(state.thread);
    }
    // three panel borders
    stroke(INK);
    strokeWeight(2.0);
    noFill();
    for (const r of PANELS) rect(r.x0, r.y0, r.s, r.s);
    // signature
    noStroke();
    fill(INK);
    textSize(24);
    textAlign(LEFT, BASELINE);
    text(signatureText(), P, TH - P + 40);
    noFill();
}

function syncControlButtons() {
    for (const def of CONTROL_DEFS) if (ctrlButtons[def.key]) ctrlButtons[def.key].textContent = def.opts[ui[def.key]];
}

function randomizeAll() {
    for (const def of CONTROL_DEFS) {
        if (def.key === 'wobble') continue;
        ui[def.key] = Math.floor(Math.random() * def.opts.length);
    }
    syncControlButtons();
    regenerate(true);
}

function setupControls() {
    const panel = document.getElementById('controls');
    for (const def of CONTROL_DEFS) {
        const row = document.createElement('div');
        row.className = 'ctrl';
        const lab = document.createElement('span');
        lab.className = 'ctrl-name';
        lab.textContent = def.label;
        const btn = document.createElement('button');
        btn.className = 'ctrl-val';
        btn.textContent = def.opts[ui[def.key]];
        btn.addEventListener('click', () => {
            ui[def.key] = (ui[def.key] + 1) % def.opts.length;
            btn.textContent = def.opts[ui[def.key]];
            regenerate(false);
        });
        ctrlButtons[def.key] = btn;
        row.appendChild(lab);
        row.appendChild(btn);
        panel.appendChild(row);
    }
    document.getElementById('btn-random').addEventListener('click', randomizeAll);
    document.getElementById('btn-refresh').addEventListener('click', () => regenerate(true));
    document.getElementById('btn-svg').addEventListener('click', () => exportSVG());
    document.getElementById('btn-png').addEventListener('click', () => exportPNG(1));
    document.getElementById('btn-png4').addEventListener('click', () => exportPNG(4));
}

function exportSVG() {}
function exportPNG(scale) {}

function setup() {
    const c = createCanvas(TW, TH);
    c.parent('canvas-container');
    pixelDensity(1);
    noLoop();
    setupControls();
    regenerate(true);
}

function draw() {}

function mousePressed() {
    if (mouseX >= 0 && mouseX <= TW && mouseY >= 0 && mouseY <= TH) regenerate(true);
}
