# Gather

One contested ground, three moments. A single [Attrition](https://github.com/lukaszlysakowski/attrition)
field — the same seed, the same shared curl terrain — rendered three times at three erosion
levels. The dominant CENTER panel carries the densest, most-intact render (the ground at its
richest); the wings flank it in two states of ruin — LEFT partly eroded, RIGHT overrun. It is a
Harold Fisk river-meander map made literal — the history of a channel that erased and rewrote
itself — in the form of a religious triptych: a dominant central image flanked by two attending
wings, the intact core between two ruins.

One red line: a single continuous thread stitched from each panel's dominant frontier (its C=0
truce line) across the gutters — one war along one unbroken line, spanning the intact center out
to the overrun right.

## Running

Static files, no build step: serve the directory (`npx serve . --listen 3466`) and open
`index.html`.

## Performance

Each render runs **three** full Attrition two-species settles (one per panel), so it is the
heaviest piece in the family — a default render (Count Low, Settle Light) takes several seconds
per panel in the browser. Lower Settle, or expect the wait at higher Count.

## Controls

- **Field** — Scale · Strength (the shared curl terrain, identical across panels)
- **Populations** — Count · Balance · Seeding (identical across panels)
- **Progression** — Early / Rising / Late (the erosion triad: how far the three levels span; the
  gentlest is always placed in the center, so a wider span = more ruined wings)
- **Settle** — Off/Light/Full
- **Style** — Wobble (default Off)
- randomize / refresh · click canvas = new seed
- **Exports:** `svg` (full composite), `png` (1×), `png 5x` (high-res raster), plus per-panel
  exports — `svg · per panel` and `png · per panel` (5×) — each writing three standalone files
  (left / center / right), a clean square in its own coordinates with its border, streaks, its
  slice of the red thread, and a per-panel signature (the right panel is mirrored, matching the
  composition)

## How it works

- One `rollField` rolls the shared curl terrain; the two-species engine then runs three times on
  it at three erosion levels (the Progression triad).
- Each panel's depositor streaklines are cut into voids wherever the eroders won (C ≤ 0); the
  panels are mapped into a center-dominant three-square layout.
- The three erosion levels are placed into panels via `PANEL_AG_ORDER = [1,0,2]` — center gets the
  gentlest (densest), left the middle, right the heaviest — so `% held` reads center > left > right.
- The right panel is horizontally mirrored (`flip: true`) so the two wings face inward toward the
  center — a symmetric, icon-like framing.
- The red thread joins each panel's frontier chains into one continuous line across the gutters.
  The wings each contribute their single longest chain (they hold plenty of contested frontier);
  the dense CENTER holds very little frontier (it is barely eroded), so it stitches its several
  longest chains together — ordered left→right — so the thread still travels through the center.
  The composite signature (bottom-right) is `Gather · seed N · date`; per-panel exports use
  `Gather · seed N · <panel> · date`. (Held % is no longer printed on the art.)

## Exports

Layered SVG pen passes (Borders / Streaks-light / Streaks-heavy / Thread / Signature) for
multi-pen plotting; PNG at 1x (3830×1690) and 4x (15320×6760).

## Family

[palimpsest](https://github.com/lukaszlysakowski/palimpsest) ·
[core-samples](https://github.com/lukaszlysakowski/core-samples) ·
[second-reading](https://github.com/lukaszlysakowski/second-reading) ·
[fold](https://github.com/lukaszlysakowski/fold) ·
[watershed](https://github.com/lukaszlysakowski/watershed) ·
[interference](https://github.com/lukaszlysakowski/interference) ·
[drift](https://github.com/lukaszlysakowski/drift) ·
[attrition](https://github.com/lukaszlysakowski/attrition) ·
[field-script](https://github.com/lukaszlysakowski/field-script)
