# Task 5: The One Red Thread

## Status
DONE

## What This Task Does
Implements the red thread — a single polyline stitched from the dominant (longest) frontier chain of each panel, mapped into triptych coordinates, with orientation normalized L→R and connectors between consecutive panels.

## Implementation Steps

- [x] Replace `buildThread()` stub with complete implementation
- [x] Add `chainLength(chain)` helper
- [x] Add `orientLR(chain)` helper
- [x] Create `.superpowers/sdd/task-5-verify.js` with 8 checks
- [x] Commit code
- [x] Run verify (SLOW — multiple 3-panel regenerates)
- [x] Report results

## Results

### Verify Output
```
  ok  thread exists (>=2 pts)
  ok  thread is finite (no NaN)
  ok  thread spans into the right panel
  ok  thread starts at or left of center panel
  ok  dominant chain per panel is the longest
  ok  exactly one thread polyline
  ok  Early triad still yields one thread (edge case)
  ok  determinism: thread

8 passed, 0 failed
```

### Code
- `chainLength(chain)` — sums segment lengths to get polyline length
- `orientLR(chain)` — reverses chain if last.x < first.x (ensures left-to-right flow)
- `buildThread()` — selects longest chain per panel, orients L→R, maps to triptych coords, concatenates into single polyline

### Commit
```
4cb3f45 Task 5: the one red thread — dominant frontier chains stitched across gutters
```

---
