# Task 1 — Scaffold Report

Status: DONE

## Checklist
- [x] Step 1: Copy vendored assets
- [x] Step 2: Adapt index.html
- [x] Step 3: Write index.js skeleton
- [x] Step 4: Write verify script
- [x] Step 5: Run verify
- [x] Step 6: Commit

## Commits
- `7eed98f` — Task 1: scaffold — landscape triptych page, layout, seed plumbing, harness

## Test Results
```
  ok  canvas TW=3830, TH=1690
  ok  3 panels
  ok  center is largest + wings centered
  ok  center vertically spans full height inside pad
  ok  ui defaults
  ok  regenerate(false) keeps seed
  ok  panelMap corners → center rect
  ok  signature format

8 passed, 0 failed
```

## Implementation Notes
- Copied `p5.min.js`, `p5-stub.js` from Attrition verbatim
- Adapted `index.html`: changed title and sidebar heading to "Triptych", kept `<style>` block and all container/button IDs byte-for-byte
- CSS classes used in setupControls: `.ctrl`, `.ctrl-name`, `.ctrl-val` (confirmed from Attrition's HTML/CSS)
- Transcribed `index.js` skeleton verbatim from brief (constants, layout, ui state, pipeline hooks, regenerate, seededRng, wobblePts, drawPoly, panelMap, signatureText, renderAll, setupControls, etc.)
- Transcribed verify script verbatim from brief
- All 8 verification checks pass

## Concerns
None
