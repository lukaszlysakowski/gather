# Triptych

One contested ground, three moments. A single [Attrition](https://github.com/lukaszlysakowski/attrition)
field — the same seed, the same shared curl terrain — rendered three times across the panels as
the same battle unfolding in time: LEFT the ground barely touched, CENTER the contest at its
height, RIGHT the ground overrun. Read left to right, it is a Harold Fisk river-meander map made
literal — the history of a channel that erased and rewrote itself — in the form of a religious
triptych: a dominant central image flanked by two attending wings.

One red line: a single continuous thread stitched from each panel's dominant frontier (its C=0
truce line) across the gutters. Because erosion grows left→right, the thread starts short and
simple and becomes long and tortured as it travels — the war intensifying along one unbroken
line.

## Running

Static files, no build step: serve the directory (`npx serve . --listen 3466`) and open
`index.html`.

## Performance

Each render runs **three** full Attrition two-species settles (one per panel), so it is the
heaviest piece in the family — a default triptych (Count Low, Settle Light) takes several seconds
per panel in the browser. Lower Settle, or expect the wait at higher Count.

## Controls

- **Field** — Scale · Strength (the shared curl terrain, identical across panels)
- **Populations** — Count · Balance · Seeding (identical across panels)
- **Progression** — Early / Rising / Late (the erosion triad: how far the three panels span from
  untouched to overrun)
- **Settle** — Off/Light/Full
- **Style** — Wobble (default Off)
- randomize / refresh / svg / png / png 4x · click canvas = new seed

## How it works

- One `rollField` rolls the shared curl terrain; the two-species engine then runs three times on
  it at three erosion levels (the Progression triad).
- Each panel's depositor streaklines are cut into voids wherever the eroders won (C ≤ 0); the
  panels are mapped into a center-dominant three-square layout.
- The red thread takes the single longest frontier chain from each panel and joins them across
  the gutters into one continuous line — the `% held` in the signature (`L C R`) quantifies the
  progression.

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
