# FLL 3D Simulator — Development Plan (v2)

## Current State (Completed)

All 15 missions placed on field with basic box/cylinder primitives. Mat texture corrected. Left-side mission guide panel. Start/Reset controls. Basic physics-based scoring engine (push only). Persistent scored missions list at top-right. Positions corrected to match official field chart.

---

## Mission Interaction Classification

### Category A: Push/Physics Missions
Robot body pushes objects. Scoring is physics-based (distance, hinge angle, movement detection).

| Mission | Action | Physics Behavior |
|---------|--------|-----------------|
| M02 Shark | Push shark out of cave | Push dynamic body away from static cave |
| M03 Coral Reef | Flip reef segments | Push hinge to rotate |
| M06 Raise the Mast | Push mast up | Push hinge to rotate upward |
| M07 Kraken's Treasure | Push chest out of nest | Push dynamic body away |
| M10 Send Over Submersible | Push flag + submersible | Push hinge + dynamic body |
| M13 Change Shipping Lanes | Push ship to new lane | Push dynamic body to zone |

### Category B: Key-Trigger Missions
Drive near + press E to perform action. Complex interactions (hang, hook, latch, place, collect).

| Mission | Action | Stages |
|---------|--------|--------|
| M01 Coral Nursery | Hang tree, flip buds | 2 stages (20 + 20 pts) |
| M04 Scuba Diver | Deliver diver to safe zone | 1 stage (20 pts) |
| M05 Angler Fish | Latch fish in shipwreck | 1 stage (30 pts) |
| M08 Artificial Habitat | Stack habitat segments | 2 stages (20 + 20 pts) |
| M09 Unexpected Encounter | Release creature to seep | 1 stage (20 pts) |
| M11 Sonar Discovery | Reveal whales via sonar | 2 stages (20 + 10 pts) |
| M12 Feed the Whale | Place krill in mouth | 3 stages (10 each, max 30 pts) |
| M14 Sample Collection | Collect 4 sample types | 4 stages (10 each, max 40 pts) |
| M15 Research Vessel | Load cargo, latch port | 1 stage (20 pts) |

---

## Implementation Phases

### Phase 1: Map GearsBot Objects to Our Missions
**Goal:** Analyze `FLL2024.json` and create a complete mapping of GearsBot objects → our missions.

**What:** The GearsBot simulator (QuirkyCort/gears) has `FLL2024.json` containing all 15 mission objects as compound primitives (boxes, cylinders, spheres, hinges) with accurate colors and physics. We need to identify which GearsBot object corresponds to which mission.

**Tasks:**
- Parse all 15 GearsBot objects and their sub-parts
- Cross-reference positions with official field layout to identify each mission
- Create mapping table: GearsBot Object Index → Mission ID → Part descriptions
- Document coordinate conversion formula (GearsBot cm → our meters)

**Output:** `mission-mapping.md` reference document.

---

### Phase 2: Build Compound Primitive Renderer
**Goal:** Extend `missionRenderer.ts` to create multi-part 3D models instead of single boxes.

**What:** Currently each mission is rendered as 1–3 simple shapes. We need to support compound models with 3–26 sub-parts, each with its own type, position, size, color, rotation, and physics.

**Tasks:**
- Define `CompoundPart` type: `{ type, relativePosition, size, color, rotation, physicsType }`
- Define `CompoundModel` type: array of `CompoundPart` with optional hinge joints
- Refactor `renderMission()` to build compound models from data definitions
- Group all sub-parts under a parent transform node for easy reset
- Store initial positions of all sub-parts for reset functionality
- Support hinge joints between parts (axis, limits, motor)

**Output:** Updated renderer that creates realistic multi-part 3D objects.

---

### Phase 3: Convert GearsBot Models → Our Format
**Goal:** Translate all 15 GearsBot compound primitive definitions into our mission data.

**What:** Write a conversion script that reads `FLL2024.json` and outputs TypeScript-compatible mission part definitions in our coordinate system.

**Tasks:**
- Write Python conversion script: GearsBot JSON → our `missions.ts` format
- Apply coordinate transformation:
  - GearsBot: 200cm × 100cm field, positions in cm, origin at center
  - Ours: ~2.362m × 1.143m field, positions in meters, origin at center
  - Scale: `our_x = gears_x * (2.362/200)`, `our_z = gears_y * (1.143/100)`
- Preserve hex color codes (already compatible)
- Convert hinge definitions (axis, limits)
- Manually verify each converted mission against official photos
- Update `missions.ts` with new compound model definitions

**Output:** Updated `missions.ts` with realistic compound models for all 15 missions.

---

### Phase 4: Proximity Detection System
**Goal:** Detect when robot is near a mission and show an interaction prompt.

**Tasks:**
- Add `triggerRadius` to each mission definition (default ~0.15m)
- Every frame during match, check robot distance to all Category B missions
- Track the "nearest interactable mission" within trigger range
- Show floating "Press [E] — Mission Name" prompt above active mission
- Add visual highlight (glow/outline) on the active mission
- Only show prompt for Category B missions (Category A is physics-only)

**Output:** Working proximity detection with visual prompt overlay.

---

### Phase 5: Mission Action Framework
**Goal:** Create the action execution system for Category B missions.

**Tasks:**
- Define `MissionAction` interface:
  - `canTrigger(robotPos, completedStages)` — is robot in range + stage available?
  - `execute(parts, scene)` — play animation, update state
  - `getStageCount()` — total stages for this mission
- Each Category B mission gets action implementation with 1–4 stages
- Track completed stages per mission
- Prevent re-triggering completed stages
- Wire "E" key to execute next available stage on active mission
- Actions are one-way (undo only via Reset)

**Output:** Working action framework for staged mission execution.

---

### Phase 6: Mission Animations
**Goal:** Create smooth Babylon.js animations for all 9 Category B mission actions.

**Tasks:** For each mission, create a 0.3–1.5 second animation sequence:

| Mission | Animation Description | Duration |
|---------|----------------------|----------|
| M01 Stage 1 | Tree rises up onto support post | 0.5s |
| M01 Stage 2 | Coral buds rotate 180° (flip open) | 0.3s |
| M04 | Diver lifts up, moves to safe zone | 0.8s |
| M05 | Fish slides into wreck, gate closes | 0.7s |
| M08 Stage 1 | First segment rotates into stacked position | 0.3s |
| M08 Stage 2 | Second segment stacks on top | 0.3s |
| M09 | Creature pops up, slides to cold seep | 0.8s |
| M11 Stage 1 | First sonar panel flips 180° | 0.4s |
| M11 Stage 2 | Second panel flips, reveals whale | 0.4s |
| M12 (×3) | Each krill moves into whale mouth | 0.3s each |
| M14 (×4) | Each sample lifts off its location | 0.3s each |
| M15 | Items slide into cargo, latch connects | 0.7s |

- Use Babylon.js `Animation` class for smooth lerps
- Disable E-key during animation to prevent double-trigger
- After animation, update scoring state immediately

**Output:** All Category B missions have smooth trigger animations.

---

### Phase 7: Update Scoring Engine for Hybrid System
**Goal:** Unify physics-based (Cat A) and trigger-based (Cat B) scoring.

**Tasks:**
- Category A: keep existing physics checks (distance, movement, hinge angle)
- Category B: score based on completed action stages (not physics)
- Remove physics scoring checks for Category B missions to avoid conflicts
- Update `completedEvents` to include both types
- Ensure Reset clears both physics state AND trigger state
- Ensure Start resets all trigger states

**Output:** Unified scoring engine handling both interaction types.

---

### Phase 8: M16 Precision Tokens
**Goal:** Implement the precision token bonus scoring.

**Tasks:**
- Add 6 small precision token objects near the launch area
- Tokens are dynamic physics objects (can be knocked off field)
- At match end (timer reaches 0), count tokens remaining on field
- Award bonus: 6 remaining → 50pts, 5 → 50pts, 4 → 35pts, 3 → 25pts, 2 → 15pts, 1 → 10pts
- Show token count in the UI during match
- Tokens reset with other objects on Reset

**Output:** Working precision token system with end-of-match bonus.

---

### Phase 9: UI Polish & Feedback
**Goal:** Make the interaction system feel polished and informative.

**Tasks:**
- Floating "Press E" prompt: styled pill, smooth appear/disappear
- Score popup: green "+X pts" animation on score (both categories)
- Mission guide panel: icons to distinguish push (🔨) vs interact (🔑)
- Mission guide panel: show completion status (checkmarks per stage)
- Sound effects: Web Audio API tone on successful score
- Optional: click mission in guide → camera zooms to that mission

**Output:** Polished interaction UX with clear visual and audio feedback.

---

### Phase 10: Testing, Balancing & Delivery
**Goal:** Test all 15 missions + M16, tune parameters, and deliver.

**Tasks:**
- Test each Category A mission: push scoring works correctly
- Test each Category B mission: proximity + E + animation + scoring
- Test multi-stage missions: all stages work independently
- Test Reset: all objects return to initial state (physics + animated positions)
- Test Start: robot resets, timer starts, scores clear
- Tune trigger radii and physics parameters
- Save checkpoint, push to GitHub, deliver

**Output:** Fully tested simulator with all missions playable and scoring correctly.

---

## Phase Dependency Chain

Animations (Phase 6) require compound models to exist, because we need individual sub-meshes to animate (e.g., separate tree, support post, and coral buds for M01). The dependency chain is:

```
Phase 1: Map GearsBot Objects (identify which parts are which)
    │
    ▼
Phase 2: Build Compound Renderer (support multi-part models)
    │
    ▼
Phase 3: Convert Models (get realistic multi-part objects in scene)
    │
    ├──────────────────────────────────┐
    ▼                                  ▼
Phase 4: Proximity Detection     Phase 7: Scoring Engine Update
    │                              (can start Cat A physics tuning)
    ▼
Phase 5: Action Framework
    │
    ▼
Phase 6: Animations (REQUIRES Phase 3 — needs individual meshes)
    │
    ├──────────────────────────────────┐
    ▼                                  ▼
Phase 7: Scoring Engine          Phase 8: M16 Precision Tokens
    (finalize Cat B scoring)           │
    │                                  │
    ▼                                  ▼
Phase 9: UI Polish & Feedback
    │
    ▼
Phase 10: Testing, Balancing & Delivery
```

**Critical path:** Phases 1 → 2 → 3 → 5 → 6 → 7 → 10

**Can run in parallel:**
- Phase 4 (proximity detection) can start alongside Phase 2–3 since the framework code doesn't need actual models
- Phase 8 (precision tokens) is independent and can be done anytime after Phase 3
- Phase 9 (UI polish) can start after Phase 6 is done

---

## Effort Estimate

| Phase | Effort | Primary Files |
|-------|--------|--------------|
| 1: Map GearsBot Objects | Low | Reference doc only |
| 2: Compound Renderer | Medium | `missionRenderer.ts` |
| 3: Convert Models | Medium | `missions.ts`, conversion script |
| 4: Proximity Detection | Medium | `useBabylonScene.ts`, `Home.tsx` |
| 5: Action Framework | Medium-High | New `missionActions.ts` |
| 6: Animations | High | `missionActions.ts` |
| 7: Scoring Engine | Medium | `scoringEngine.ts` |
| 8: Precision Tokens | Low-Medium | `missions.ts`, `scoringEngine.ts` |
| 9: UI Polish | Medium | `Home.tsx`, `missionRenderer.ts` |
| 10: Testing & Delivery | Low-Medium | Bug fixes across all files |

---

## Technical Notes

- Animations use Babylon.js `Animation` class or manual lerp in render loop
- Proximity checks run in existing physics tick loop (cheap — just distance calc)
- "E" key added to existing keyboard handler in `useBabylonScene`
- Mission actions stored in new file: `client/src/lib/missionActions.ts`
- Actions modify Rapier rigid body positions directly (teleport, not physics force)
- GearsBot `FLL2024.json` is the source of truth for compound model geometry
- All compound parts grouped under parent TransformNode for easy reset
