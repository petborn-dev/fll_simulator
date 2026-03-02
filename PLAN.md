# FLL 3D Simulator — Development Plan (v3 — Final)

## Project Status: All 10 Phases Complete

All 16 missions are implemented and playable. The simulator features compound 3D models derived from GearsBot data, a hybrid scoring engine (physics + trigger), proximity detection with E-key interactions, smooth Babylon.js animations, Web Audio sound effects, dynamic mission label colors, click-to-zoom, and M16 precision token bonuses. Deployed to GitHub Pages with automatic CI/CD.

**Live:** [https://petborn-dev.github.io/fll_simulator/](https://petborn-dev.github.io/fll_simulator/)

---

## Phase Completion Summary

| Phase | Title | Status | Key Files Modified |
|-------|-------|--------|--------------------|
| 1 | Map GearsBot Objects → Missions | **Done** | `MAPPING.md` |
| 2 | Build Compound Primitive Renderer | **Done** | `missionRenderer.ts` |
| 3 | Convert GearsBot Models → Our Format | **Done** | `missions.ts` |
| 4 | Proximity Detection System | **Done** | `useBabylonScene.ts`, `Home.tsx`, `missions.ts` |
| 5 | Mission Action Framework | **Done** | `scoringEngine.ts`, `useBabylonScene.ts` |
| 6 | Mission Animations | **Done** | `missionAnimations.ts`, `useBabylonScene.ts` |
| 7 | Hybrid Scoring Engine | **Done** | `scoringEngine.ts` |
| 8 | M16 Precision Tokens | **Done** | `missions.ts`, `scoringEngine.ts`, `Home.tsx` |
| 9 | UI Polish & Feedback | **Done** | `soundEffects.ts`, `Home.tsx`, `useBabylonScene.ts` |
| 10 | Testing, Balancing & Delivery | **Done** | `missionRenderer.ts`, `missionAnimations.ts`, `Home.tsx` |

---

## Mission Interaction Classification

### Category A: Push/Physics Missions

Robot body pushes objects. Scoring is physics-based (distance, hinge angle, movement detection). Physics checks run every frame in the `tick()` method.

| Mission | Action | Physics Behavior |
|---------|--------|-----------------|
| M02 Shark | Push shark out of cave | Push dynamic body away from static cave |
| M03 Coral Reef | Flip reef segments | Push hinge to rotate |
| M06 Raise the Mast | Push mast up | Push hinge to rotate upward |
| M07 Kraken's Treasure | Push chest out of nest | Push dynamic body away |
| M10 Send Over Submersible | Push flag + submersible | Push hinge + dynamic body |
| M13 Change Shipping Lanes | Push ship to new lane | Push dynamic body to zone |

### Category B: Key-Trigger Missions

Drive near + press E to perform action. Complex interactions (hang, hook, latch, place, collect). Scored exclusively via `triggerMissionAction()`. Physics checks are skipped for these missions.

| Mission | Action | Stages | Points |
|---------|--------|--------|--------|
| M01 Coral Nursery | Hang tree, flip buds | 2 | 30 + 20 |
| M04 Scuba Diver | Deliver diver, resurface | 2 | 20 + 20 |
| M05 Angler Fish | Latch fish in target | 1 | 30 |
| M08 Artificial Habitat | Stack habitat segments | 2 | 20 + 20 |
| M09 Unexpected Encounter | Release creature | 1 | 30 |
| M11 Sonar Discovery | Flip sonar panels | 2 | 20 + 10 |
| M12 Feed the Whale | Place krill in mouth | 3 | 10 + 10 + 30 |
| M14 Sample Collection | Collect 4 samples | 4 | 10 + 10 + 15 + 20 |
| M15 Research Vessel | Load cargo, latch port | 2 | 20 + 20 |

### M16 Precision Tokens

Six dynamic red cylinders in the home area. End-of-match bonus based on tokens remaining on field. Maximum bonus: 50 points.

---

## Architecture Decisions

### Hybrid Scoring Engine

The scoring engine maintains a `TRIGGER_MISSIONS` set built from mission definitions at initialization. During `tick()`, physics checks are skipped for any mission in this set. This prevents conflicts where physics might accidentally complete a trigger mission (e.g., the robot bumping a Category B object and triggering a score). Category B missions are scored only through explicit E-key interaction via `triggerMissionAction()`.

### Compound Model Optimization

Static compound parts (those with `physicsType: "static"` and no animation targets) are merged into single meshes using Babylon.js `Mesh.MergeMeshes()` after initial rendering. This reduces draw calls from approximately 150+ individual meshes to approximately 30-40 merged meshes, improving frame rate from ~5 FPS to ~8-15 FPS depending on hardware. Shadow casters are limited to dynamic and hinge parts only.

### Coordinate Conversion

GearsBot uses a 100cm × 100cm field with center origin. Our simulator uses a ~2.362m × 1.143m field with center origin. The conversion formula applied during Phase 3 was:

```
our_x = gearsbot_x * (2.362 / 200)
our_z = gearsbot_z * (1.143 / 100)
our_y = gearsbot_y * (1.143 / 100)  // height uses same scale as depth
```

Sub-part positions are relative to their parent object's world position in GearsBot, so the conversion applies the parent offset first, then scales.

### Sound Design

All sounds are procedurally generated using the Web Audio API oscillator and gain nodes. No audio files are loaded. This keeps the bundle size small and avoids CORS issues on static hosting. Three sound types are used: ascending chime (score), click (E key press), and fanfare (match end).

### GitHub Pages Routing

Since GitHub Pages serves static files and does not support server-side routing, the wouter router is configured with a `base` prop derived from Vite's `import.meta.env.BASE_URL`. In production, this resolves to `/fll_simulator/`, allowing the SPA to correctly route under the subdirectory.

---

## Known Limitations and Future Work

### Current Limitations

1. **Performance**: Frame rate is approximately 8-15 FPS on mid-range hardware due to the large number of physics bodies and meshes. Further optimization (instanced rendering, LOD, reduced physics tick rate) could improve this.

2. **Category A Tuning**: Some physics-based missions (M02 Shark, M03 Coral Reef) may require geometry and threshold tuning to reliably trigger scoring when pushed.

3. **Mobile Support**: The simulator is desktop-only. Touch controls, responsive layout, and GPU optimization would be needed for mobile/tablet support.

4. **Missing Compound Models**: Five missions (M02, M04, M13, M14, M15) use simplified placeholder geometry rather than detailed compound models.

### Potential Improvements

1. Merge all remaining static meshes and implement instanced rendering for repeated shapes.
2. Add a volume/mute toggle for sound effects.
3. Add a "best score" tracker using localStorage.
4. Implement camera-follow mode that tracks the robot.
5. Add a replay system to record and playback match runs.
6. Build detailed compound models for the 5 placeholder missions.
7. Add a 2D minimap overlay for navigation.

---

## Technical Notes

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@babylonjs/core` | 8.53+ | 3D rendering engine |
| `@babylonjs/gui` | 8.53+ | In-scene GUI (labels, overlays) |
| `@dimforge/rapier3d-compat` | 0.19+ | WASM physics engine |
| `react` | 19.2+ | UI framework |
| `wouter` | 3.3+ | Client-side routing |
| `tailwindcss` | 4.1+ | Utility CSS framework |
| `vite` | 7.1+ | Build tool and dev server |

### File Size

The production bundle is approximately 9 MB (2.3 MB gzipped), dominated by Babylon.js and Rapier WASM. Code splitting could reduce initial load time but is not yet implemented.

### Browser Compatibility

Tested on Chromium-based browsers (Chrome, Edge). Requires WebGL 2 and WebAssembly support. Safari and Firefox should work but are not actively tested.
