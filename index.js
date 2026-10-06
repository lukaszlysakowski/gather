// Gather — one contested ground, three moments. A meta-composition over Attrition.
// Family: palimpsest / core-samples / second-reading / fold / watershed / interference / drift / attrition.

// --- field-coordinate space (Attrition's native, per panel) ---
const FS = 2170;
const FPAD = Math.round(FS * 0.04);
const GRID_N = 300;

// --- gather layout ---
const SC = 1500, SW = 1000, G = 70, P = 95;
const TW = P + SW + G + SC + G + SW + P;   // 3830
const TH = P + SC + P;                       // 1690
const WING_Y = P + (SC - SW) / 2;            // 345 — wings vertically centered
const PANELS = [
    { x0: P, y0: WING_Y, s: SW },                            // LEFT
    { x0: P + SW + G, y0: P, s: SC },                        // CENTER
    { x0: P + SW + G + SC + G, y0: WING_Y, s: SW, flip: true } // RIGHT (horizontally mirrored)
];

const PAPER = '#F7E6D4';
const INK = '#1A1613';
const RED = '#A93B2A';

// Progression triads: erosion aggression [left, center, right], strictly increasing.
const PROGRESSIONS = {
    Early: [0.12, 0.90, 1.80],
    Rising: [0.22, 1.20, 2.60],
    Late: [0.38, 1.55, 3.40]
};

const CONTROL_DEFS = [
    { key: 'scale',       label: 'Scale',       opts: ['Fine', 'Med', 'Broad'],                    def: 1 },
    { key: 'strength',    label: 'Strength',    opts: ['Low', 'Med', 'High'],                      def: 1 },
    { key: 'count',       label: 'Count',       opts: ['Low', 'Med', 'High'],                      def: 0 },
    { key: 'balance',     label: 'Balance',     opts: ['More-eroders', 'Even', 'More-depositors'], def: 1 },
    { key: 'seeding',     label: 'Seeding',     opts: ['Scattered', 'Edge', 'Clustered'],          def: 0 },
    { key: 'progression', label: 'Progression', opts: ['Early', 'Rising', 'Late'],                 def: 1 },
    { key: 'settle',      label: 'Settle',      opts: ['Off', 'Light', 'Full'],                    def: 1 },
    { key: 'wobble',      label: 'Wobble',      opts: ['Off', 'On'],                               def: 0, display: true },
    { key: 'borders',     label: 'Borders',     opts: ['On', 'Off'],                               def: 0, display: true }
];

// `display: true` controls only affect rendering — toggling them re-draws (renderAll) instead of
// re-running the simulation, and they are left out of randomize.
const ui = { scale: 1, strength: 1, count: 0, balance: 1, seeding: 0, progression: 1, settle: 1, wobble: 0, borders: 0 };

const state = {
    masterSeed: 1,
    field: null,          // shared rolled potential params (rollField, once)
    activeAg: 0,          // erosion aggression for the panel currently running
    D: null, E: null, Dmax: 1, CposMax: 1,   // per-panel scratch grids (Attrition)
    segments: [], frontier: [], heldFrac: 0, // per-panel scratch outputs (Attrition buildRender)
    panels: [],           // [{segments, frontier, heldFrac}] x3, field coords
    held: [0, 0, 0],      // heldFrac per panel
    thread: []            // ONE red polyline in page coords
};

const ctrlButtons = {};

// --- flow field constants and implementation ---
const COUNTS = [800, 1600, 2600];         // Count: Low / Med / High (total particle budget)
const BALANCE = [0.4, 0.55, 0.7];         // Balance: depositor share — More-eroders / Even / More-depositors
const WAVE_CAP = [1, 6, 14];              // Settle: Off / Light / Full
const FLOW_SPEED = 6;
const CURL_H = 1.5;
const DEP_AMOUNT = 1;
const ERODE_AMOUNT = 1;
const SLOW = 0.7;
const DIVERT = 0.9;
const SLOW_FLOOR = 0.15;
const HUNT = 1.2;

function makeNoise2D(seed) {
    function hash(ix, iy) {
        let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 974634167)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    const smooth = t => t * t * (3 - 2 * t);
    function vnoise(x, y) {
        const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
        const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
        const u = smooth(fx), v = smooth(fy);
        return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
    }
    return function fbm(x, y) {
        return (vnoise(x, y) + 0.5 * vnoise(x * 2.07 + 19.3, y * 2.07 + 7.7)) / 1.5;
    };
}

function rollField() {
    const ns = [0.0034, 0.0022, 0.0013][ui.scale];
    const strength = [0.7, 1.0, 1.45][ui.strength];
    state.field = { ns, strength, ox: random(1000), oy: random(1000), fbm: makeNoise2D(state.masterSeed + 4099) };
}

function potential(x, y) {
    const f = state.field;
    return f.fbm(x * f.ns + f.ox, y * f.ns + f.oy) * 900 * f.strength;
}

function baseField(x, y) {
    const dpsi_dx = (potential(x + CURL_H, y) - potential(x - CURL_H, y)) / (2 * CURL_H);
    const dpsi_dy = (potential(x, y + CURL_H) - potential(x, y - CURL_H)) / (2 * CURL_H);
    let vx = dpsi_dy, vy = -dpsi_dx;
    const m = Math.hypot(vx, vy);
    if (m < 1e-9) return { vx: 0, vy: 0 };
    return { vx: (vx / m) * FLOW_SPEED, vy: (vy / m) * FLOW_SPEED };
}

// Depositors channelize on the ground they still HOLD (Cpos), like Drift but on C⁺ not raw D.
function depBentField(x, y) {
    const v = baseField(x, y);
    const d = CposHatAt(x, y);
    if (d <= 0) return v;
    const s = Math.max(SLOW_FLOOR, 1 - SLOW * d);
    const g = gridGrad(CposHatAt, x, y);
    const gm = Math.hypot(g.gx, g.gy);
    let tx = 0, ty = 0;
    if (gm > 1e-6) {
        const ux = -g.gy / gm, uy = g.gx / gm;      // rot90 of unit gradient (follow the contour)
        const speed = Math.hypot(v.vx, v.vy);
        tx = DIVERT * d * ux * speed;
        ty = DIVERT * d * uy * speed;
    }
    return { vx: s * v.vx + tx, vy: s * v.vy + ty };
}

// Eroders HUNT: steer up the deposition gradient toward the channels depositors built.
function eroBentField(x, y) {
    const v = baseField(x, y);
    const ag = state.activeAg;
    if (ag === 0) return v;
    const hd = DhatAt(x, y);
    if (hd <= 0) return v;
    const g = gridGrad(DhatAt, x, y);
    const gm = Math.hypot(g.gx, g.gy);
    if (gm <= 1e-6) return v;
    const ux = g.gx / gm, uy = g.gy / gm;           // UP the gradient (toward more density)
    const speed = Math.hypot(v.vx, v.vy);
    return { vx: v.vx + HUNT * ag * hd * ux * speed, vy: v.vy + HUNT * ag * hd * uy * speed };
}

// --- grid helpers (deposition, erosion, contested field) ---

function pageToGrid(x, y) {
    const span = FS - 2 * FPAD;
    return { gx: ((x - FPAD) / span) * GRID_N, gy: ((y - FPAD) / span) * GRID_N };
}

function gridsReset() {
    state.D = new Float32Array(GRID_N * GRID_N);
    state.E = new Float32Array(GRID_N * GRID_N);
    state.Dmax = 1;
    state.CposMax = 1;
}

function splat(grid, x, y, amount) {
    const { gx, gy } = pageToGrid(x, y);
    const ix = Math.floor(gx), iy = Math.floor(gy);
    if (ix < 0 || iy < 0 || ix >= GRID_N - 1 || iy >= GRID_N - 1) return;
    const fx = gx - ix, fy = gy - iy;
    grid[iy * GRID_N + ix]           += amount * (1 - fx) * (1 - fy);
    grid[iy * GRID_N + ix + 1]       += amount * fx * (1 - fy);
    grid[(iy + 1) * GRID_N + ix]     += amount * (1 - fx) * fy;
    grid[(iy + 1) * GRID_N + ix + 1] += amount * fx * fy;
}

function smoothGrid(grid) {
    const n = GRID_N, tmp = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const l = x > 0 ? grid[y * n + x - 1] : grid[y * n + x];
        const r = x < n - 1 ? grid[y * n + x + 1] : grid[y * n + x];
        tmp[y * n + x] = (l + 2 * grid[y * n + x] + r) / 4;
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const u = y > 0 ? tmp[(y - 1) * n + x] : tmp[y * n + x];
        const dn = y < n - 1 ? tmp[(y + 1) * n + x] : tmp[y * n + x];
        grid[y * n + x] = (u + 2 * tmp[y * n + x] + dn) / 4;
    }
}

function gridNorm() {
    const D = state.D, E = state.E;
    let dm = 0, cm = 0;
    for (let i = 0; i < D.length; i++) {
        if (D[i] > dm) dm = D[i];
        const c = D[i] - E[i];
        if (c > cm) cm = c;
    }
    state.Dmax = dm > 1e-9 ? dm : 1;
    state.CposMax = cm > 1e-9 ? cm : 1;
}

// bilinear sample of an arbitrary per-cell value function f(idx)
function sampleBilinear(fCell, x, y) {
    const { gx, gy } = pageToGrid(x, y);
    const ix = Math.floor(gx), iy = Math.floor(gy);
    if (ix < 0 || iy < 0 || ix >= GRID_N - 1 || iy >= GRID_N - 1) return 0;
    const fx = gx - ix, fy = gy - iy, n = GRID_N;
    return fCell(iy * n + ix) * (1 - fx) * (1 - fy) + fCell(iy * n + ix + 1) * fx * (1 - fy) +
        fCell((iy + 1) * n + ix) * (1 - fx) * fy + fCell((iy + 1) * n + ix + 1) * fx * fy;
}

function Cat(x, y) { return sampleBilinear(i => state.D[i] - state.E[i], x, y); }
function DhatAt(x, y) { return sampleBilinear(i => state.D[i] / state.Dmax, x, y); }
function CposHatAt(x, y) { return sampleBilinear(i => Math.max(state.D[i] - state.E[i], 0) / state.CposMax, x, y); }

function gridGrad(sampler, x, y) {
    const h = (FS - 2 * FPAD) / GRID_N;
    return { gx: (sampler(x + h, y) - sampler(x - h, y)) / (2 * h), gy: (sampler(x, y + h) - sampler(x, y - h)) / (2 * h) };
}

// --- waves: two-species advection, settle to truce ---
const DT = 1;
const MAX_STEPS = 400;
const STALL_EPS = 0.4;
const SETTLE_EPS = 0.02;
const MIN_PTS = 2;

function inRegion(x, y) { return x >= FPAD && x <= FS - FPAD && y >= FPAD && y <= FS - FPAD; }

function waveStarts(rng, P) {
    const span = FS - 2 * FPAD, pts = [];
    if (ui.seeding === 0) {
        for (let i = 0; i < P; i++) pts.push({ x: FPAD + rng() * span, y: FPAD + rng() * span });
    } else if (ui.seeding === 1) {
        const side = Math.floor(rng() * 4);
        for (let i = 0; i < P; i++) {
            const t = rng(), inset = FPAD + rng() * span * 0.04;
            if (side === 0) pts.push({ x: FPAD + t * span, y: inset });
            else if (side === 1) pts.push({ x: FS - inset, y: FPAD + t * span });
            else if (side === 2) pts.push({ x: FPAD + t * span, y: FS - inset });
            else pts.push({ x: inset, y: FPAD + t * span });
        }
    } else {
        const nBlobs = 2 + Math.floor(rng() * 3), blobs = [];
        for (let b = 0; b < nBlobs; b++) blobs.push({ cx: FPAD + rng() * span, cy: FPAD + rng() * span, r: span * (0.04 + rng() * 0.06) });
        for (let i = 0; i < P; i++) {
            const b = blobs[Math.floor(rng() * nBlobs)];
            const a = rng() * Math.PI * 2, rad = b.r * Math.sqrt(rng());
            pts.push({ x: b.cx + Math.cos(a) * rad, y: b.cy + Math.sin(a) * rad });
        }
    }
    return pts;
}

function advect(start, bentFn) {
    const pts = [{ x: start.x, y: start.y }];
    let x = start.x, y = start.y;
    for (let step = 0; step < MAX_STEPS; step++) {
        const k1 = bentFn(x, y);
        const k2 = bentFn(x + 0.5 * DT * k1.vx, y + 0.5 * DT * k1.vy);
        const nx = x + DT * k2.vx, ny = y + DT * k2.vy;
        if (Math.hypot(nx - x, ny - y) < STALL_EPS) break;
        x = nx; y = ny;
        pts.push({ x, y });
        if (!inRegion(x, y)) break;
    }
    return pts;
}

function runWaves() {
    gridsReset();
    gridNorm();
    state.paths = [];
    const maxWaves = WAVE_CAP[ui.settle];
    const total = COUNTS[ui.count];
    const depShare = BALANCE[ui.balance];
    const ag = state.activeAg;
    const Pd = Math.round(total * depShare);
    const Pe = ag === 0 ? 0 : total - Pd;
    state.wavesRun = 0;
    for (let w = 0; w < maxWaves; w++) {
        const before = new Float32Array(state.D.length);
        for (let i = 0; i < before.length; i++) before[i] = state.D[i] - state.E[i];   // C before
        // Phase 1: advect BOTH species on the frozen field (no splatting yet)
        const depRng = seededRng((state.masterSeed + w * 9161) >>> 0);
        const eroRng = seededRng((state.masterSeed + w * 7331) >>> 0);
        const depStarts = waveStarts(depRng, Pd);
        const eroStarts = Pe > 0 ? waveStarts(eroRng, Pe) : [];
        const depPaths = [];
        for (const s of depStarts) { const p = advect(s, depBentField); if (p.length >= MIN_PTS) depPaths.push(p); }
        const eroPaths = [];
        for (const s of eroStarts) { const p = advect(s, eroBentField); if (p.length >= MIN_PTS) eroPaths.push(p); }
        // Phase 2: apply all deposits (+D) and all scour (+E), THEN smooth/normalize
        for (const p of depPaths) { state.paths.push({ pts: p }); for (const v of p) splat(state.D, v.x, v.y, DEP_AMOUNT); }
        for (const p of eroPaths) { for (const v of p) splat(state.E, v.x, v.y, ag * ERODE_AMOUNT); }
        smoothGrid(state.D); smoothGrid(state.E); gridNorm();
        state.wavesRun = w + 1;
        // settle delta on C
        let diff = 0, cabs = 0;
        for (let i = 0; i < state.D.length; i++) { const c = state.D[i] - state.E[i]; diff += Math.abs(c - before[i]); cabs += Math.abs(c); }
        const delta = diff / Math.max(cabs, 1e-9);
        if (w > 0 && delta < SETTLE_EPS) break;
    }
}

// --- rendering: segment culling and frontier ---
const HEAVY_THRESH = 0.28;

// Split a depositor path into held (C>0) runs, cutting at interpolated C=0 crossings.
function cullPath(pts) {
    const runs = [];
    let cur = [];
    let prev = pts[0], prevC = Cat(prev.x, prev.y);
    if (prevC > 0) cur.push(prev);
    for (let i = 1; i < pts.length; i++) {
        const p = pts[i], c = Cat(p.x, p.y);
        if ((prevC > 0) !== (c > 0)) {
            // crossing: interpolate the C=0 point between prev and p
            const t = prevC / (prevC - c);   // prevC>0,c<=0 or vice versa → t in (0,1]
            const cx = prev.x + t * (p.x - prev.x), cy = prev.y + t * (p.y - prev.y);
            if (prevC > 0) { cur.push({ x: cx, y: cy }); if (cur.length >= 2) runs.push(cur); cur = []; }
            else { cur = [{ x: cx, y: cy }]; }
        }
        if (c > 0) cur.push(p);
        prev = p; prevC = c;
    }
    if (cur.length >= 2) runs.push(cur);
    // classify each run by mean CposHat
    return runs.map(run => {
        let sum = 0; for (const v of run) sum += CposHatAt(v.x, v.y);
        const mean = sum / run.length;
        return { pts: run, cls: mean >= HEAVY_THRESH ? 1 : 0 };
    });
}

function samplePt(gx, gy) {
    const cell = (FS - 2 * FPAD) / GRID_N;
    return { x: FPAD + (gx + 0.5) * cell, y: FPAD + (gy + 0.5) * cell };
}

function marchCell(x, y, v00, v10, v01, v11, lv, segs) {
    let c = 0;
    if (v00 >= lv) c |= 1;
    if (v10 >= lv) c |= 2;
    if (v11 >= lv) c |= 4;
    if (v01 >= lv) c |= 8;
    if (c === 0 || c === 15) return;
    const t = (a, b) => (lv - a) / (b - a);
    const top = () => [x + t(v00, v10), y], bottom = () => [x + t(v01, v11), y + 1];
    const left = () => [x, y + t(v00, v01)], right = () => [x + 1, y + t(v10, v11)];
    const add = (p, q) => segs.push([p[0], p[1], q[0], q[1]]);
    switch (c) {
        case 1: case 14: add(left(), top()); break;
        case 2: case 13: add(top(), right()); break;
        case 3: case 12: add(left(), right()); break;
        case 4: case 11: add(right(), bottom()); break;
        case 6: case 9: add(top(), bottom()); break;
        case 7: case 8: add(left(), bottom()); break;
        case 5: { const mid = (v00 + v10 + v01 + v11) / 4 >= lv; if (mid) { add(left(), top()); add(right(), bottom()); } else { add(left(), bottom()); add(top(), right()); } break; }
        case 10: { const mid = (v00 + v10 + v01 + v11) / 4 >= lv; if (mid) { add(top(), right()); add(left(), bottom()); } else { add(left(), top()); add(right(), bottom()); } break; }
    }
}

function chainSegments(segs, keyFn) {
    const key = keyFn || ((x, y) => x + ',' + y);
    const adj = new Map();
    const addAdj = (k, si) => { if (!adj.has(k)) adj.set(k, []); adj.get(k).push(si); };
    segs.forEach((s, si) => { addAdj(key(s[0], s[1]), si); addAdj(key(s[2], s[3]), si); });
    const used = new Uint8Array(segs.length), chains = [];
    for (let si = 0; si < segs.length; si++) {
        if (used[si]) continue;
        used[si] = 1;
        const chain = [[segs[si][0], segs[si][1]], [segs[si][2], segs[si][3]]];
        for (const end of [1, 0]) {
            while (true) {
                const tip = end ? chain[chain.length - 1] : chain[0];
                const cands = (adj.get(key(tip[0], tip[1])) || []).filter(j => !used[j]);
                if (!cands.length) break;
                const j = cands[0]; used[j] = 1;
                const s = segs[j];
                const other = (Math.abs(s[0] - tip[0]) < 1e-9 && Math.abs(s[1] - tip[1]) < 1e-9) ? [s[2], s[3]] : [s[0], s[1]];
                if (end) chain.push(other); else chain.unshift(other);
            }
        }
        chains.push(chain);
    }
    return chains;
}

function chaikin(pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
        out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    out.push(pts[pts.length - 1]);
    return out;
}

// marching squares at level 0 on the C grid (C = D − E), but ONLY in contested cells —
// those where erosion is actually present (some corner E > EROSION_EPS). Otherwise C = D
// crosses 0 merely at the EDGE of deposit coverage, which is not a frontier. This makes the
// frontier the true truce line (where the two armies met), and gives Erosion=Off (E≡0) an
// empty frontier as the spec requires.
const EROSION_EPS = 1e-4;
function marchLevelC() {
    const n = GRID_N, D = state.D, E = state.E, segs = [];
    const cval = i => D[i] - E[i];
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
        const e00 = E[y * n + x], e10 = E[y * n + x + 1], e01 = E[(y + 1) * n + x], e11 = E[(y + 1) * n + x + 1];
        if (e00 < EROSION_EPS && e10 < EROSION_EPS && e01 < EROSION_EPS && e11 < EROSION_EPS) continue; // uncontested cell
        marchCell(x, y, cval(y * n + x), cval(y * n + x + 1), cval((y + 1) * n + x), cval((y + 1) * n + x + 1), 0, segs);
    }
    const fkey = (x, y) => x.toFixed(6) + ',' + y.toFixed(6);
    return chainSegments(segs, fkey).map(ch => chaikin(chaikin(ch.map(gp => samplePt(gp[0], gp[1])))));
}

function buildRender() {
    state.segments = [];
    for (const p of state.paths) for (const seg of cullPath(p.pts)) state.segments.push(seg);
    state.frontier = state.D ? marchLevelC() : [];
    let held = 0;
    if (state.D) for (let i = 0; i < state.D.length; i++) if (state.D[i] - state.E[i] > 0) held++;
    state.heldFrac = state.D ? held / state.D.length : 0;
}

// --- pipeline hooks (filled by later tasks) ---
// Panel placement: which triad level (0=gentlest/densest .. 2=heaviest/most-eroded) each
// panel gets. The dominant CENTER panel holds the densest render (gentlest erosion); the
// wings flank it — LEFT medium, RIGHT heaviest. So held reads center > left > right.
const PANEL_AG_ORDER = [1, 0, 2]; // [left, center, right] -> triad index

function runPanels() {
    const triad = PROGRESSIONS[CONTROL_DEFS.find(d => d.key === 'progression').opts[ui.progression]];
    state.panels = [];
    state.held = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
        state.activeAg = triad[PANEL_AG_ORDER[i]];
        runWaves();       // reads state.field (shared) + state.activeAg; fills state.D/E, state.paths
        buildRender();    // fills state.segments, state.frontier, state.heldFrac (field coords)
        // capture this panel's outputs (the scratch fields are overwritten by the next run)
        state.panels.push({
            segments: state.segments.map(s => ({ cls: s.cls, pts: s.pts.map(p => ({ x: p.x, y: p.y })) })),
            frontier: state.frontier.map(pl => pl.map(p => ({ x: p.x, y: p.y }))),
            heldFrac: state.heldFrac
        });
        state.held[i] = state.heldFrac;
    }
}
function chainLength(chain) {
    let L = 0;
    for (let i = 1; i < chain.length; i++) L += Math.hypot(chain[i].x - chain[i - 1].x, chain[i].y - chain[i - 1].y);
    return L;
}

function orientLR(chain) {
    if (chain.length >= 2 && chain[chain.length - 1].x < chain[0].x) return chain.slice().reverse();
    return chain;
}

// How many frontier chains each panel contributes to the red thread. The wings' single dominant
// chain is already long; the dense CENTER holds very little frontier (it is barely eroded), so it
// stitches together its several longest chains — ordered left→right — so the thread travels
// through the center rather than clipping one short arc.
const THREAD_CHAINS = [1, 5, 1]; // [left, center, right]

// The top-k longest frontier chains a panel contributes to the thread (field-space, unmapped).
function panelThreadChains(i) {
    const chains = state.panels[i] ? state.panels[i].frontier : [];
    if (!chains.length) return [];
    return chains.slice().sort((a, b) => chainLength(b) - chainLength(a)).slice(0, THREAD_CHAINS[i]);
}

// Stitch a panel's chains into one polyline, mapped by `mapFn` (global or panel-local). Each chain
// is oriented left→right in the MAPPED space, then the chains are ordered left→right and joined —
// so the thread reads continuously and correctly whether or not the panel is flipped.
function stitchThread(chains, mapFn) {
    const mapped = chains.map(ch => orientLR(ch.map(mapFn)));
    mapped.sort((a, b) => a[0].x - b[0].x);
    const part = [];
    for (const m of mapped) for (const p of m) part.push(p);
    return part;
}

function panelThreadPart(i) {
    return stitchThread(panelThreadChains(i), p => panelMap(p, PANELS[i]));
}

function buildThread() {
    const parts = [];
    for (let i = 0; i < 3; i++) {
        const part = panelThreadPart(i);
        if (part.length) parts.push(part);
    }
    // concatenate the present panels' parts into ONE polyline; the join between consecutive parts
    // (and between the center's stitched chains) is a straight connector — the thread stays single.
    state.thread = [];
    for (const part of parts) for (const p of part) state.thread.push(p);
}

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
    let u = (pt.x - FPAD) / span;
    const v = (pt.y - FPAD) / span;
    if (rect.flip) u = 1 - u;   // horizontally mirror this panel's content within its rect
    return { x: rect.x0 + u * rect.s, y: rect.y0 + v * rect.s };
}

function dateStamp() {
    const d = new Date();
    const p2 = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

function signatureText() {
    return `Gather · seed ${state.masterSeed} · ${dateStamp()}`;
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
    // the one red thread (already in page coords)
    if (state.thread.length >= 2) {
        stroke(RED);
        strokeWeight(3.2);
        drawPoly(state.thread);
    }
    // three panel borders (ui.borders: 0 = On, 1 = Off)
    if (ui.borders === 0) {
        stroke(INK);
        strokeWeight(2.0);
        noFill();
        for (const r of PANELS) rect(r.x0, r.y0, r.s, r.s);
    }
    // signature
    noStroke();
    fill(INK);
    textSize(24);
    textAlign(RIGHT, BASELINE);
    text(signatureText(), TW - P, TH - P + 40);
    noFill();
}

function syncControlButtons() {
    for (const def of CONTROL_DEFS) if (ctrlButtons[def.key]) ctrlButtons[def.key].textContent = def.opts[ui[def.key]];
}

function randomizeAll() {
    for (const def of CONTROL_DEFS) {
        if (def.display) continue;
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
            if (def.display) renderAll(); else regenerate(false);
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
    document.getElementById('btn-png5').addEventListener('click', () => exportPNG(5));
    document.getElementById('btn-panels').addEventListener('click', () => exportPanels(5));
}

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
    s += svgPass('Borders', INK, 0.9, ui.borders === 0 ? borderPaths : []);
    s += svgPass('Streaks-light', INK, 0.4, light);
    s += svgPass('Streaks-heavy', INK, 0.8, heavy);
    s += svgPass('Thread', RED, 1.7, threadPaths);
    s += `  <g id="Signature" inkscape:groupmode="layer" inkscape:label="Signature">\n` +
        `    <text x="${TW - P}" y="${TH - P + 40}" text-anchor="end" font-family="monospace" font-size="24" fill="${INK}">${signatureText()}</text>\n  </g>\n`;
    s += '</svg>\n';
    return s;
}

function exportSVG() {
    const blob = new Blob([buildSVG()], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gather-seed${state.masterSeed}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
}

// One panel as a standalone SVG on the FULL triptych canvas (TW×TH), in register with the others:
// that panel's border + streaks at their true position, plus the COMPLETE red thread (the one line
// crossing all three panels) as its own layer. Overlaying the three SVGs reconstructs the composite.
const PANEL_NAMES = ['left', 'center', 'right'];
function buildPanelSVG(i) {
    const rect = PANELS[i];
    const map = pt => panelMap(pt, rect);   // triptych coords (carries any per-panel flip)
    const light = [], heavy = [];
    for (const seg of state.panels[i].segments) {
        const d = polyToPath(seg.pts.map(map));
        (seg.cls === 1 ? heavy : light).push(d);
    }
    const borderPaths = [`M ${rect.x0} ${rect.y0} L ${rect.x0 + rect.s} ${rect.y0} L ${rect.x0 + rect.s} ${rect.y0 + rect.s} L ${rect.x0} ${rect.y0 + rect.s} L ${rect.x0} ${rect.y0}`];
    const threadPaths = state.thread.length >= 2 ? [polyToPath(state.thread)] : [];   // the full cross-panel line
    let out = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ` +
        `width="${TW}" height="${TH}" viewBox="0 0 ${TW} ${TH}">\n`;
    out += `  <rect width="${TW}" height="${TH}" fill="${PAPER}"/>\n`;
    out += svgPass('Border', INK, 0.9, ui.borders === 0 ? borderPaths : []);
    out += svgPass('Streaks-light', INK, 0.4, light);
    out += svgPass('Streaks-heavy', INK, 0.8, heavy);
    out += svgPass('Thread', RED, 1.7, threadPaths);
    // per-panel exports carry NO colophon (the seed/date live in the filename)
    out += '</svg>\n';
    return out;
}

// --- minimal dependency-free ZIP (store / no compression) ---
// The per-panel exports bundle their three files into ONE .zip so a single download fires.
// Browsers gate *multiple* programmatic downloads behind a permission prompt and silently drop
// all but the first, so looping three saves only ever yielded the left panel; one zip sidesteps it.
function crc32(bytes) {
    if (!crc32.table) {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
        crc32.table = t;
    }
    const t = crc32.table; let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = t[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}
function makeZip(entries) {
    const enc = new TextEncoder();
    const u16 = v => [v & 0xFF, (v >>> 8) & 0xFF];
    const u32 = v => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];
    const parts = []; const central = []; let offset = 0;
    for (const e of entries) {
        const name = enc.encode(e.name), data = e.bytes, crc = crc32(data);
        const lh = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
        parts.push(new Uint8Array(lh), name, data);
        central.push({ crc, size: data.length, name, offset });
        offset += lh.length + name.length + data.length;
    }
    const cdStart = offset; const cd = [];
    for (const c of central) {
        const ch = [].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(c.crc), u32(c.size), u32(c.size), u16(c.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.offset));
        cd.push(new Uint8Array(ch), c.name);
        offset += ch.length + c.name.length;
    }
    const eocd = [].concat(u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(offset - cdStart), u32(cdStart), u16(0));
    return new Blob([...parts, ...cd, new Uint8Array(eocd)], { type: 'application/zip' });
}
function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Single "per panel" export: ALL SIX files in one zip — 3 full-canvas SVGs (each carrying the whole
// cross-panel red thread) + 3 panel PNGs. One download sidesteps the browser multiple-download gate.
function exportPanels(scale) {
    const enc = new TextEncoder();
    const entries = [];
    for (let i = 0; i < 3; i++) {
        entries.push({ name: `gather-seed${state.masterSeed}-${PANEL_NAMES[i]}.svg`, bytes: enc.encode(buildPanelSVG(i)) });
    }
    let i = 0;
    (function next() {
        if (i >= 3) { downloadBlob(makeZip(entries), `gather-seed${state.masterSeed}-panels.zip`); return; }
        const idx = i++;
        const rect = PANELS[idx];
        const pg = createGraphics(rect.s, rect.s);
        pg.pixelDensity(scale);
        drawPanelTo(pg, idx);
        pg.canvas.toBlob(async (blob) => {
            entries.push({ name: `gather-seed${state.masterSeed}-${PANEL_NAMES[idx]}-${scale}x.png`, bytes: new Uint8Array(await blob.arrayBuffer()) });
            pg.remove();
            next();
        }, 'image/png');
    })();
}

function exportPNG(scale) {
    pixelDensity(scale);
    renderAll();
    saveCanvas(`gather-seed${state.masterSeed}-${scale}x`, 'png');
    pixelDensity(1);
    renderAll();
}

// draw one polyline into an offscreen graphics buffer (canvas analog of polyToPath)
function drawPolyTo(pg, pts) {
    const w = wobblePts(pts);
    pg.beginShape();
    for (const p of w) pg.vertex(p.x, p.y);
    pg.endShape();
}

// render one panel into a graphics buffer in LOCAL coords (origin at the panel's top-left) — the
// raster analog of buildPanelSVG, so a per-panel PNG matches the per-panel SVG (flip carried
// through panelMap; same stitched thread as the composite).
function drawPanelTo(pg, i) {
    const rect = PANELS[i], s = rect.s;
    const local = pt => { const q = panelMap(pt, rect); return { x: q.x - rect.x0, y: q.y - rect.y0 }; };
    pg.background(PAPER);
    pg.noFill();
    pg.stroke(INK);
    pg.strokeWeight(0.8);
    for (const seg of state.panels[i].segments) if (seg.cls === 0) drawPolyTo(pg, seg.pts.map(local));
    pg.strokeWeight(1.4);
    for (const seg of state.panels[i].segments) if (seg.cls === 1) drawPolyTo(pg, seg.pts.map(local));
    const thread = stitchThread(panelThreadChains(i), local);
    if (thread.length >= 2) { pg.stroke(RED); pg.strokeWeight(3.2); drawPolyTo(pg, thread); }
    if (ui.borders === 0) {
        pg.stroke(INK);
        pg.strokeWeight(2.0);
        pg.noFill();
        pg.rect(0, 0, s, s);
    }
    // per-panel exports carry NO colophon (the seed/date live in the filename)
}


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
