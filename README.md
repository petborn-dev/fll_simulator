# FLL 3D Simulator — SUBMERGED 2024-25

A browser-based 3D simulator for the **FIRST LEGO League (FLL) SUBMERGED** 2024-25 season. Drive a differential-drive robot across a realistic field mat, interact with all 16 missions, and practice scoring strategies — no physical robot or field required.

**Live Demo:** [https://petborn-dev.github.io/fll_simulator/](https://petborn-dev.github.io/fll_simulator/)

---

## Table of Contents

1. [Overview](#overview)
2. [How the Simulator Works](#how-the-simulator-works)
3. [Controls](#controls)
4. [Mission System](#mission-system)
5. [Scoring System](#scoring-system)
6. [Architecture](#architecture)
7. [Project Structure](#project-structure)
8. [Tech Stack](#tech-stack)
9. [Getting Started](#getting-started)
10. [Deployment](#deployment)
11. [Data Sources](#data-sources)
12. [License](#license)

---

## Overview

The FLL 3D Simulator recreates the SUBMERGED 2024-25 competition field in a fully interactive 3D environment. It is designed to help FLL teams understand mission mechanics, plan robot strategies, and practice scoring runs without access to a physical field setup.

The simulator features a real-time physics engine (Rapier WASM) for realistic object interactions, compound 3D models derived from the open-source GearsBot project [1], and a hybrid scoring engine that supports both physics-based and trigger-based mission completion. A 2:30 match timer, score tracking, precision token bonuses, and sound effects provide a competition-like experience.

---

## How the Simulator Works

### 3D Scene

The simulator renders a top-down 3D view of the official FLL SUBMERGED field mat using Babylon.js 8. The field mat is a textured ground plane scaled to the official dimensions (approximately 2.362m × 1.143m in simulator units). Mission models are placed at positions matching the official field layout, with each model built from compound primitives (boxes, cylinders, spheres) that approximate the real LEGO mission models.

### Physics Engine

Rapier 3D (compiled to WebAssembly) handles all physics simulation. Every mission object has a physics body — either **static** (immovable, like walls and supports), **dynamic** (can be pushed by the robot), or **hinge** (rotates around an axis, like levers and flaps). The robot itself is a dynamic body with two motorized wheels that simulate differential drive steering.

### Robot

The robot is modeled as a rectangular body with two independently driven wheels. Steering is achieved through differential wheel speeds — turning left slows the left wheel while the right wheel continues, and vice versa. The robot starts in the left home area and can be reset to its starting position at any time.

### Match Flow

A match follows the standard FLL competition format:

1. **Ready** — The field is set up with all missions in their starting positions. The timer shows 2:30.
2. **Start** — Press the START button to begin the countdown. The robot can now be driven and missions can be scored.
3. **Running** — Drive the robot to complete missions. Score events appear in real-time. The timer counts down from 2:30.
4. **Ended** — When the timer reaches zero, the match ends. Precision token bonuses are calculated and added to the final score. A summary overlay shows the breakdown.

---

## Controls

| Key / Input | Action |
|-------------|--------|
| **W** | Drive forward |
| **A** | Turn left |
| **S** | Drive backward |
| **D** | Turn right |
| **E** | Interact with nearby mission (Category B only) |
| **Mouse Drag** | Orbit camera around the field |
| **Scroll Wheel** | Zoom in/out |

The bottom status bar displays the current control hints, robot telemetry (position, heading, speed), and engine information.

---

## Mission System

The simulator implements all 16 missions from the SUBMERGED season. Missions are divided into two categories based on how they are completed.

### Category A: Push/Physics Missions

These missions are completed by physically pushing objects with the robot. The scoring engine monitors object positions, distances, and hinge angles every frame to detect completion.

| ID | Mission | Points | Mechanic |
|----|---------|--------|----------|
| M02 | Shark | 30 | Push shark out of cave |
| M03 | Coral Reef | 40 | Flip reef segments via hinge |
| M06 | Raise the Mast | 30 | Push mast upward via hinge |
| M07 | Kraken's Treasure | 30 | Push chest out of nest |
| M10 | Send Over Submersible | 40 | Push flag + submersible |
| M13 | Change Shipping Lanes | 20 | Push ship to new lane |

### Category B: Trigger/Interact Missions

These missions require the robot to drive within a trigger radius and press the **E** key. They represent complex real-world interactions (hanging, latching, collecting, stacking) that cannot be simulated with simple pushing.

| ID | Mission | Points | Stages | Mechanic |
|----|---------|--------|--------|----------|
| M01 | Coral Nursery | 50 | 2 | Hang tree (30pt) + flip buds (20pt) |
| M04 | Scuba Diver | 40 | 2 | Deliver diver (20pt) + resurface (20pt) |
| M05 | Angler Fish | 30 | 1 | Latch fish in target area |
| M08 | Artificial Habitat | 40 | 2 | Stack segments (20pt each) |
| M09 | Unexpected Encounter | 30 | 1 | Release creature to cold seep |
| M11 | Sonar Discovery | 30 | 2 | Flip sonar panels (20pt + 10pt) |
| M12 | Feed the Whale | 50 | 3 | Place krill in mouth (10pt + 10pt + 30pt) |
| M14 | Sample Collection | 55 | 4 | Collect samples (10pt + 10pt + 15pt + 20pt) |
| M15 | Research Vessel | 40 | 2 | Load cargo (20pt) + latch port (20pt) |

### M16: Precision Tokens

Six small red precision tokens are placed in the home area. They are dynamic physics objects that can be knocked off the field during the match. At match end, remaining tokens award a bonus:

| Tokens Remaining | Bonus Points |
|-----------------|-------------|
| 6 | 50 |
| 5 | 50 |
| 4 | 35 |
| 3 | 25 |
| 2 | 15 |
| 1 | 10 |
| 0 | 0 |

### Mission Labels

Floating labels above each mission model indicate completion status through color coding:

- **Cyan** — Not yet attempted
- **Amber** — Partially completed (some stages done)
- **Green** — Fully completed

---

## Scoring System

The scoring engine uses a **hybrid approach** that separates physics-based and trigger-based scoring to prevent conflicts.

### Physics Scoring (Category A)

The `tick()` method runs every frame during a match. For each Category A mission, it checks physics conditions such as object displacement from starting position, hinge rotation angles, and whether objects have entered target zones. When a condition is met for the first time, points are awarded and a score event is fired.

### Trigger Scoring (Category B)

Category B missions are scored exclusively through the `triggerMissionAction()` method, which is called when the player presses E near an interactable mission. The method completes the next uncompleted scoring condition for that mission, awards points, and fires a score event. Physics checks are explicitly skipped for Category B missions to avoid double-scoring.

### Proximity Detection

A proximity detection system runs at approximately 5Hz (every ~12 frames) during a match. It calculates the distance from the robot to every incomplete Category B mission. If the robot is within a mission's trigger radius (typically 0.15–0.20m), a floating "Press [E]" prompt appears showing the mission name, ID, and current stage progress.

### Match End Scoring

When the timer reaches zero, `processMatchEnd()` is called. It counts precision tokens remaining on the field (Y position > -0.01m, meaning not fallen off) and awards the corresponding bonus. The final score is the sum of all mission points plus the precision bonus, with a theoretical maximum of **605 points** (555 from missions + 50 from precision tokens).

### Score Events

Every scoring action generates a `ScoreEvent` object containing the mission ID, description, points awarded, and timestamp. These events are displayed as animated notifications in the top-right corner of the screen and persist in the mission guide sidebar.

---

## Architecture

The application is a single-page React app with the following major components:

### Scene Management (`useBabylonScene.ts`)

The central hook that manages the entire 3D simulation. It initializes the Babylon.js engine and scene, creates the field mat and lighting, spawns the robot with differential drive physics, renders all mission objects, runs the physics simulation loop, handles keyboard input, performs proximity detection, and exposes scene state to the React UI layer.

### Mission Definitions (`missions.ts`)

A data-driven module containing all 16 mission definitions. Each mission specifies its ID, name, description, position on the field, scoring conditions, interaction type (push or trigger), trigger radius, and compound model geometry. Compound models are defined as arrays of child shapes (boxes, cylinders, spheres) with relative positions, sizes, colors, and rotations.

### Mission Renderer (`missionRenderer.ts`)

Translates mission definitions into Babylon.js meshes with Rapier physics bodies. Handles compound model creation (parent mesh with child sub-meshes), physics body assignment (static, dynamic, hinge), label creation using Babylon GUI, and mesh optimization (merging static compound children to reduce draw calls). Also provides `resetMissionObjects()` to restore all meshes to their initial positions and `updateMissionLabelColors()` to reflect completion status.

### Scoring Engine (`scoringEngine.ts`)

Maintains match state including timer, score, per-mission completion status, score events, and precision token tracking. The `tick()` method runs physics-based checks for Category A missions. The `triggerMissionAction()` method handles Category B scoring. The `processMatchEnd()` method calculates precision token bonuses.

### Mission Animations (`missionAnimations.ts`)

Provides animation functions for all 9 Category B missions. Each animation uses Babylon.js `Animation` class for smooth position, rotation, or scale transitions. Animations include a green flash and scale pulse on completion. An animation lock prevents double-triggering during playback.

### Sound Effects (`soundEffects.ts`)

Web Audio API-based sound synthesis. Generates ascending chime tones on successful scoring, click sounds on E key press, and a fanfare sequence on match end. All sounds are procedurally generated — no audio files required.

### UI Layer (`Home.tsx`)

The main page component that assembles the full interface: header bar (title, timer, score, precision tokens, FPS), collapsible mission guide sidebar (with push/trigger icons, stage checkmarks, click-to-zoom), 3D canvas, floating E-key prompt overlay, score event notifications, match-ended overlay with score breakdown, and bottom telemetry bar.

---

## Project Structure

```
client/src/
├── App.tsx                    # Router with GitHub Pages base path support
├── main.tsx                   # React entry point
├── index.css                  # Global styles and Tailwind theme tokens
├── pages/
│   ├── Home.tsx               # Main simulator page with all UI components
│   └── NotFound.tsx           # 404 fallback page
├── hooks/
│   └── useBabylonScene.ts     # Core 3D scene management hook
├── lib/
│   ├── missions.ts            # Mission definitions with compound models
│   ├── missionRenderer.ts     # 3D mesh creation and optimization
│   ├── missionAnimations.ts   # Babylon.js animations for Category B
│   ├── scoringEngine.ts       # Hybrid scoring engine
│   ├── soundEffects.ts        # Web Audio API sound synthesis
│   └── utils.ts               # Utility helpers
├── components/
│   └── ui/                    # shadcn/ui component library
└── contexts/
    └── ThemeContext.tsx        # Dark/light theme provider
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **3D Engine** | Babylon.js 8 | Scene rendering, materials, lighting, GUI, animations |
| **Physics** | Rapier 3D (WASM) | Rigid body simulation, collisions, hinges |
| **UI Framework** | React 19 | Component-based UI with hooks |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Utility-first CSS with pre-built components |
| **Routing** | Wouter 3 | Lightweight client-side routing with base path support |
| **Icons** | Lucide React | Consistent icon set |
| **Audio** | Web Audio API | Procedural sound effects |
| **Build** | Vite 7 | Fast dev server and production bundling |
| **Language** | TypeScript 5.6 | Type-safe development |
| **Deployment** | GitHub Pages + Actions | Automatic CI/CD on push to main |

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+

### Installation

```bash
git clone https://github.com/petborn-dev/fll_simulator.git
cd fll_simulator
pnpm install
```

### Development

```bash
pnpm dev
```

The dev server starts at `http://localhost:3000`. Hot module replacement is enabled for instant feedback during development.

### Production Build

```bash
NODE_ENV=production pnpm vite build
```

The output is written to `dist/public/` and can be served by any static file host.

---

## Deployment

The project is configured for automatic deployment to GitHub Pages via GitHub Actions. Every push to the `main` branch triggers a build and deploy workflow. The site is available at:

> **https://petborn-dev.github.io/fll_simulator/**

The Vite configuration includes a conditional base path (`/fll_simulator/` in production, `/` in development) and the wouter router is configured with the same base path to support GitHub Pages subdirectory hosting.

---

## Data Sources

The compound 3D models for 10 of the 16 missions were derived from the **GearsBot** simulator's `FLL2024.json` data file. GearsBot is an open-source browser-based robot simulator created by Cort (QuirkyCort) and available at [https://github.com/QuirkyCort/gears](https://github.com/QuirkyCort/gears) under the MIT license [1]. A Python conversion script was used to translate GearsBot's coordinate system (centimeters, center origin) to the simulator's coordinate system (meters, center origin) while preserving colors, shapes, and relative positions.

The remaining 5 missions (M02, M04, M13, M14, M15) use simplified placeholder geometry. The official FLL SUBMERGED scoring rules were referenced from the FIRST LEGO League documentation [2].

---

## References

[1]: https://github.com/QuirkyCort/gears "GearsBot — Open-source robot simulator by QuirkyCort"
[2]: https://www.firstlegoleague.org "FIRST LEGO League Official Website"

---

## License

This project is for educational purposes. The FLL SUBMERGED season content, mission designs, and scoring rules are the property of FIRST and the LEGO Foundation. GearsBot data is used under the MIT license.
