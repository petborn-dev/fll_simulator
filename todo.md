# Phase 10: Testing, Balancing & Delivery — TODO

## Bugs to Fix

- [ ] **Reset doesn't restore animated positions**: When E key triggers an animation (e.g., M01 tree lifts), the mesh position changes but `resetMissionObjects()` only resets physics bodies. Animated meshes (whose positions were changed by `animatePosition`) won't return to their original positions because the animation modifies the mesh directly, not the physics body. Need to also reset mesh positions for ALL parts (not just dynamic/hinge).
- [ ] **Animation-physics desync**: `animatePosition` updates the mesh position and then tries to set the physics body via `(window as any).__RAPIER` which is never set. The RAPIER import is direct, so this code path silently fails. Animations move meshes but physics bodies stay in place, causing scoring checks to use stale positions.
- [ ] **Label colors don't reset on match reset**: `updateMissionLabelColors` reads from match state, but after reset the labels may keep their green/amber color until the next 5Hz state update cycle.
- [ ] **M16 scoring shows "50pt" as max but actual max varies**: The M16 scoring rule has `points: 50` but the actual bonus depends on tokens remaining (could be 10-50). The sidebar shows "50pt" which is misleading for partial completion.

## Performance Optimizations

- [ ] **Merge static compound meshes**: Currently each compound child is a separate mesh (~150+ meshes total). Static parts can be merged into single meshes per mission using `Mesh.MergeMeshes()` to reduce draw calls significantly.
- [ ] **Reduce shadow casters**: Only add dynamic/hinge parts to shadow generator, skip static compound children.
- [ ] **Throttle proximity detection**: Already at ~5Hz, but could skip when robot hasn't moved.

## Balancing & Tuning

- [ ] **Verify all trigger radii**: Test each Category B mission's trigger radius to ensure the E prompt appears at a reasonable distance.
- [ ] **Test all Category A physics scoring**: Push each Cat A mission and verify scoring triggers correctly.
- [ ] **Test match reset**: Ensure all objects, scores, labels, and timer reset properly.
- [ ] **Test match end**: Verify precision token bonus calculates correctly.

## Polish

- [ ] **Add mute/volume toggle**: Sound effects play automatically with no way to mute.
- [ ] **Improve match ended overlay**: Show mission-by-mission breakdown.
