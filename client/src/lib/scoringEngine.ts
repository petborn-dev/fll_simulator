/**
 * FLL SUBMERGED — Scoring Engine (All 15 Missions)
 *
 * Manages match state (idle → running → ended), 2:30 countdown timer,
 * per-mission scoring rules, and collision-based completion detection.
 *
 * v3: Hybrid scoring engine
 * - Category A (push): physics-based checks run every frame in tick()
 * - Category B (trigger): scored only via triggerMissionAction() on E key press
 * - Physics checks are SKIPPED for Category B missions to prevent conflicts
 * - Both types share the same MISSION_SCORING_RULES definitions
 */

import type { RenderedMission, RenderedMissionPart } from "./missionRenderer";
import RAPIER from "@dimforge/rapier3d-compat";
import { getSeasonMissions } from "./missions";

// ─── Category B (trigger) mission IDs ─────────────────────────────
// These missions are scored via E key (triggerMissionAction), NOT physics.
// The tick() loop skips physics checks for these missions.
const TRIGGER_MISSION_IDS: Set<string> = new Set(
  getSeasonMissions()
    .filter((m) => m.interactionType === "trigger")
    .map((m) => m.id)
);

// ─── Match Constants ───────────────────────────────────────────────
export const MATCH_DURATION_SECONDS = 150; // 2 minutes 30 seconds

export type MatchPhase = "idle" | "running" | "ended";

// ─── Score Event (for UI notifications) ───────────────────────────
export interface ScoreEvent {
  missionId: string;
  description: string;
  points: number;
  timestamp: number;
}

// ─── Scoring Condition Types ───────────────────────────────────────
export interface ScoringCondition {
  description: string;
  hint: string;
  points: number;
  check: (parts: RenderedMissionPart[], world: RAPIER.World) => boolean;
  requiresMovement?: string;
}

// ─── Mission Score State ───────────────────────────────────────────
export interface MissionScoreState {
  missionId: string;
  missionName: string;
  maxPoints: number;
  earnedPoints: number;
  conditions: {
    description: string;
    hint: string;
    points: number;
    completed: boolean;
  }[];
}

// ─── Match State ───────────────────────────────────────────────────
export interface MatchState {
  phase: MatchPhase;
  timeRemaining: number;
  totalScore: number;
  missions: MissionScoreState[];
  recentEvents: ScoreEvent[];  // kept for backwards compat
  completedEvents: ScoreEvent[];  // persistent list of all scored conditions
}

// ─── Helper Functions ──────────────────────────────────────────────

function distXZ(a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function dist3D(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getPartPosition(parts: RenderedMissionPart[], partId: string): { x: number; y: number; z: number } | null {
  const part = parts.find((p) => p.id === partId);
  if (!part?.rigidBody) return null;
  const t = part.rigidBody.translation();
  return { x: t.x, y: t.y, z: t.z };
}

function getTriggerCenter(parts: RenderedMissionPart[], triggerId: string): { x: number; y: number; z: number } | null {
  const part = parts.find((p) => p.id === triggerId);
  if (!part?.rigidBody) return null;
  const t = part.rigidBody.translation();
  return { x: t.x, y: t.y, z: t.z };
}

function getHingeAngle(parts: RenderedMissionPart[], partId: string): number | null {
  const part = parts.find((p) => p.id === partId);
  if (!part?.joint) return null;
  try {
    const revJoint = part.joint as any;
    if (typeof revJoint.angle === 'function') return revJoint.angle();
    if (part.rigidBody) {
      const rot = part.rigidBody.rotation();
      const sinAngle = 2 * (rot.w * rot.x + rot.y * rot.z);
      return Math.asin(Math.max(-1, Math.min(1, sinAngle)));
    }
    return 0;
  } catch {
    return null;
  }
}

// ─── Scoring Rules per Mission ─────────────────────────────────────
// v2: Increased distance thresholds for easier triggering

const MISSION_SCORING_RULES: Record<string, ScoringCondition[]> = {
  // ── M01: Coral Nursery ──
  M01: [
    {
      description: "Coral tree is on the support",
      hint: "Push the coral tree onto the raised support structure",
      points: 30,
      check: (parts) => {
        const tree = getPartPosition(parts, "M01_tree");
        const support = getPartPosition(parts, "M01_support");
        if (!tree || !support) return false;
        // v2: increased threshold from 0.04 to 0.08
        return distXZ(tree, support) < 0.08 && tree.y > 0.03;
      },
    },
    {
      description: "Coral buds are flipped up",
      hint: "Push the hinge lever to flip coral buds upward",
      points: 20,
      check: (parts) => {
        const angle = getHingeAngle(parts, "M01_buds");
        if (angle === null) return false;
        // v2: reduced angle from PI/4 to PI/6 (30° instead of 45°)
        return Math.abs(angle) > Math.PI / 6;
      },
    },
  ],

  // ── M02: Shark ──
  M02: [
    {
      description: "Shark released from cave",
      hint: "Push the shark away from the cave",
      points: 20,
      check: (parts) => {
        const shark = getPartPosition(parts, "M02_shark");
        const cave = getPartPosition(parts, "M02_cave");
        if (!shark || !cave) return false;
        // v2: reduced threshold from 0.08 to 0.04
        return distXZ(shark, cave) > 0.04;
      },
      requiresMovement: "M02_shark",
    },
    {
      description: "Shark in habitat zone",
      hint: "Push the shark into the blue habitat zone",
      points: 10,
      check: (parts) => {
        const shark = getPartPosition(parts, "M02_shark");
        const habitat = getTriggerCenter(parts, "M02_habitat");
        if (!shark || !habitat) return false;
        // v2: increased threshold from 0.08 to 0.12
        return distXZ(shark, habitat) < 0.12;
      },
    },
  ],

  // ── M03: Coral Reef ──
  M03: [
    {
      description: "Coral reef panel is raised",
      hint: "Push the reef panel to flip it upward",
      points: 20,
      check: (parts) => {
        const angle = getHingeAngle(parts, "M03_reef");
        if (angle === null) return false;
        return Math.abs(angle) > Math.PI / 6;
      },
    },
    {
      description: "Reef segments standing (5 pts each)",
      hint: "Keep reef segments upright outside home",
      points: 15,
      check: (parts) => {
        const seg1 = getPartPosition(parts, "M03_seg1");
        const seg2 = getPartPosition(parts, "M03_seg2");
        const seg3 = getPartPosition(parts, "M03_seg3");
        let count = 0;
        if (seg1 && seg1.y > 0.01) count++;
        if (seg2 && seg2.y > 0.01) count++;
        if (seg3 && seg3.y > 0.01) count++;
        return count >= 2; // v2: reduced from 3 to 2
      },
    },
  ],

  // ── M04: Scuba Diver ──
  M04: [
    {
      description: "Diver away from nursery",
      hint: "Push the scuba diver away from the coral nursery area",
      points: 20,
      check: (parts) => {
        const diver = getPartPosition(parts, "M04_diver");
        const start = getPartPosition(parts, "M04_start");
        if (!diver || !start) return false;
        return distXZ(diver, start) > 0.04; // v2: reduced from 0.08
      },
      requiresMovement: "M04_diver",
    },
    {
      description: "Diver at reef support",
      hint: "Push the diver into the reef support zone (near M03)",
      points: 20,
      check: (parts) => {
        const diver = getPartPosition(parts, "M04_diver");
        const target = getTriggerCenter(parts, "M04_reef_target");
        if (!diver || !target) return false;
        return distXZ(diver, target) < 0.12; // v2: increased from 0.08
      },
    },
  ],

  // ── M05: Angler Fish ──
  M05: [
    {
      description: "Angler fish in the shipwreck",
      hint: "Push the angler fish into the shipwreck target zone",
      points: 30,
      check: (parts) => {
        const fish = getPartPosition(parts, "M05_fish");
        const target = getTriggerCenter(parts, "M05_target");
        if (!fish || !target) return false;
        return distXZ(fish, target) < 0.10; // v2: increased from 0.06
      },
    },
  ],

  // ── M06: Raise the Mast ──
  M06: [
    {
      description: "Mast is raised upright",
      hint: "Push the mast lever to raise it to an upright position",
      points: 30,
      check: (parts) => {
        const angle = getHingeAngle(parts, "M06_mast");
        if (angle === null) return false;
        return Math.abs(angle) > Math.PI / 6; // v2: reduced from PI/4
      },
    },
  ],

  // ── M07: Kraken's Treasure ──
  M07: [
    {
      description: "Treasure chest outside nest",
      hint: "Push the treasure chest completely out of the kraken's nest",
      points: 20,
      check: (parts) => {
        const chest = getPartPosition(parts, "M07_chest");
        const nest = getPartPosition(parts, "M07_nest");
        if (!chest || !nest) return false;
        return distXZ(chest, nest) > 0.04; // v2: reduced from 0.08
      },
      requiresMovement: "M07_chest",
    },
  ],

  // ── M08: Artificial Habitat ──
  M08: [
    {
      description: "At least 2 segments in target zone",
      hint: "Push at least 2 habitat segments into the marked target area",
      points: 20,
      check: (parts) => {
        const target = getTriggerCenter(parts, "M08_target");
        if (!target) return false;
        let count = 0;
        for (const segId of ["M08_seg1", "M08_seg2", "M08_seg3", "M08_seg4"]) {
          const seg = getPartPosition(parts, segId);
          if (seg && distXZ(seg, target) < 0.12) count++; // v2: increased from 0.08
        }
        return count >= 2;
      },
    },
    {
      description: "All 4 segments in target zone",
      hint: "Push all 4 habitat segments into the target area for bonus",
      points: 20,
      check: (parts) => {
        const target = getTriggerCenter(parts, "M08_target");
        if (!target) return false;
        let count = 0;
        for (const segId of ["M08_seg1", "M08_seg2", "M08_seg3", "M08_seg4"]) {
          const seg = getPartPosition(parts, segId);
          if (seg && distXZ(seg, target) < 0.12) count++;
        }
        return count >= 4;
      },
    },
  ],

  // ── M09: Unexpected Encounter ──
  M09: [
    {
      description: "Creature released from AUV",
      hint: "Knock the unknown creature off the AUV",
      points: 20,
      check: (parts) => {
        const creature = getPartPosition(parts, "M09_creature");
        const auv = getPartPosition(parts, "M09_auv");
        if (!creature || !auv) return false;
        return distXZ(creature, auv) > 0.03; // v2: reduced from 0.06
      },
      requiresMovement: "M09_creature",
    },
    {
      description: "Creature in cold seep",
      hint: "Push the creature into the cold seep zone",
      points: 10,
      check: (parts) => {
        const creature = getPartPosition(parts, "M09_creature");
        const seep = getTriggerCenter(parts, "M09_coldseep");
        if (!creature || !seep) return false;
        return distXZ(creature, seep) < 0.10; // v2: increased from 0.07
      },
    },
  ],

  // ── M10: Send Over the Submersible ──
  M10: [
    {
      description: "Yellow flag is down",
      hint: "Push the yellow flag down on its hinge",
      points: 30,
      check: (parts) => {
        const angle = getHingeAngle(parts, "M10_flag");
        if (angle === null) return false;
        return Math.abs(angle) > Math.PI / 6; // v2: reduced from PI/4
      },
    },
    {
      description: "Submersible toward opposing field",
      hint: "Push the submersible into the opposing field zone",
      points: 10,
      check: (parts) => {
        const sub = getPartPosition(parts, "M10_sub");
        const target = getTriggerCenter(parts, "M10_opposing");
        if (!sub || !target) return false;
        return distXZ(sub, target) < 0.15; // v2: increased from 0.10
      },
      requiresMovement: "M10_sub",
    },
  ],

  // ── M11: Sonar Discovery ──
  M11: [
    {
      description: "One whale revealed",
      hint: "Push the left whale panel to swing it open",
      points: 20,
      check: (parts) => {
        const angle = getHingeAngle(parts, "M11_whale1");
        if (angle === null) return false;
        return Math.abs(angle) > Math.PI / 8; // v2: reduced from PI/6
      },
    },
    {
      description: "Both whales revealed (bonus)",
      hint: "Also push the right whale panel open for bonus",
      points: 10,
      check: (parts) => {
        const a1 = getHingeAngle(parts, "M11_whale1");
        const a2 = getHingeAngle(parts, "M11_whale2");
        if (a1 === null || a2 === null) return false;
        return Math.abs(a1) > Math.PI / 8 && Math.abs(a2) > Math.PI / 8;
      },
    },
  ],

  // ── M12: Feed the Whale ──
  M12: [
    {
      description: "At least 1 krill in whale's mouth",
      hint: "Push krill pieces into the whale's mouth zone",
      points: 10,
      check: (parts) => {
        const mouth = getTriggerCenter(parts, "M12_mouth");
        if (!mouth) return false;
        for (const kid of ["M12_krill1", "M12_krill2", "M12_krill3", "M12_krill4", "M12_krill5"]) {
          const k = getPartPosition(parts, kid);
          if (k && distXZ(k, mouth) < 0.08) return true; // v2: increased from 0.05
        }
        return false;
      },
    },
    {
      description: "3+ krill in whale's mouth",
      hint: "Push 3 or more krill into the mouth for bonus points",
      points: 20,
      check: (parts) => {
        const mouth = getTriggerCenter(parts, "M12_mouth");
        if (!mouth) return false;
        let count = 0;
        for (const kid of ["M12_krill1", "M12_krill2", "M12_krill3", "M12_krill4", "M12_krill5"]) {
          const k = getPartPosition(parts, kid);
          if (k && distXZ(k, mouth) < 0.08) count++;
        }
        return count >= 3;
      },
    },
    {
      description: "All 5 krill in whale's mouth",
      hint: "Push all 5 krill into the mouth for maximum points",
      points: 20,
      check: (parts) => {
        const mouth = getTriggerCenter(parts, "M12_mouth");
        if (!mouth) return false;
        let count = 0;
        for (const kid of ["M12_krill1", "M12_krill2", "M12_krill3", "M12_krill4", "M12_krill5"]) {
          const k = getPartPosition(parts, kid);
          if (k && distXZ(k, mouth) < 0.08) count++;
        }
        return count >= 5;
      },
    },
  ],

  // ── M13: Change Shipping Lanes ──
  M13: [
    {
      description: "Cargo ship moved to lane 2",
      hint: "Push the cargo ship sideways into the lane 2 target zone",
      points: 20,
      check: (parts) => {
        const ship = getPartPosition(parts, "M13_ship");
        const target = getTriggerCenter(parts, "M13_target");
        if (!ship || !target) return false;
        return distXZ(ship, target) < 0.12; // v2: increased from 0.08
      },
      requiresMovement: "M13_ship",
    },
  ],

  // ── M14: Sample Collection ──
  M14: [
    {
      description: "Water sample collected",
      hint: "Push the water sample out of its area",
      points: 5,
      check: (parts) => {
        const sample = getPartPosition(parts, "M14_water");
        const area = getTriggerCenter(parts, "M14_water_area");
        if (!sample || !area) return false;
        return distXZ(sample, area) > 0.03; // v2: reduced from 0.05
      },
      requiresMovement: "M14_water",
    },
    {
      description: "Seabed sample collected",
      hint: "Push the seabed sample off the seabed area",
      points: 10,
      check: (parts) => {
        const sample = getPartPosition(parts, "M14_seabed");
        const area = getTriggerCenter(parts, "M14_seabed_area");
        if (!sample || !area) return false;
        return distXZ(sample, area) > 0.03;
      },
      requiresMovement: "M14_seabed",
    },
    {
      description: "Plankton sample collected",
      hint: "Push the plankton sample off the kelp forest",
      points: 10,
      check: (parts) => {
        const sample = getPartPosition(parts, "M14_plankton");
        const area = getTriggerCenter(parts, "M14_kelp_area");
        if (!sample || !area) return false;
        return distXZ(sample, area) > 0.03;
      },
      requiresMovement: "M14_plankton",
    },
    {
      description: "Trident piece off shipwreck",
      hint: "Push at least one trident piece away from the shipwreck",
      points: 20,
      check: (parts) => {
        // Just check if the trident has moved at all (gated by requiresMovement)
        const t1 = getPartPosition(parts, "M14_trident1");
        return t1 !== null;
      },
      requiresMovement: "M14_trident1",
    },
    {
      description: "Both trident pieces off (bonus)",
      hint: "Push both trident pieces away for bonus points",
      points: 10,
      check: (parts) => {
        const t2 = getPartPosition(parts, "M14_trident2");
        return t2 !== null;
      },
      requiresMovement: "M14_trident2",
    },
  ],

  // ── M15: Research Vessel ──
  M15: [
    {
      description: "Port latch engaged",
      hint: "Push the port latch to dock the research vessel",
      points: 20,
      check: (parts) => {
        const angle = getHingeAngle(parts, "M15_latch");
        if (angle === null) return false;
        return Math.abs(angle) > Math.PI / 8; // v2: reduced threshold
      },
    },
    {
      description: "Items in cargo area",
      hint: "Push samples, trident parts, or treasure chest into the cargo area",
      points: 20,
      check: (parts) => {
        const cargo = getTriggerCenter(parts, "M15_cargo");
        if (!cargo) return false;
        const angle = getHingeAngle(parts, "M15_latch");
        return angle !== null && Math.abs(angle) > Math.PI / 8;
      },
    },
  ],
};

// ─── Scoring Engine Class ──────────────────────────────────────────

export class ScoringEngine {
  private matchPhase: MatchPhase = "idle";
  private timeRemaining: number = MATCH_DURATION_SECONDS;
  private missionScores: Map<string, MissionScoreState> = new Map();
  private lastTickTime: number = 0;
  private initialPositions: Map<string, { x: number; y: number; z: number }> = new Map();
  private scoringGraceFrames: number = 0;
  private static readonly GRACE_FRAMES = 30; // ~0.5 seconds at 60fps
  private recentEvents: ScoreEvent[] = [];
  private completedEvents: ScoreEvent[] = [];
  private static readonly MAX_EVENTS = 8;

  constructor() {
    this.reset();
  }

  /** Initialize mission score states from rendered missions */
  initMissions(missions: RenderedMission[]): void {
    this.missionScores.clear();
    for (const m of missions) {
      const rules = MISSION_SCORING_RULES[m.id] ?? [];
      this.missionScores.set(m.id, {
        missionId: m.id,
        missionName: m.name,
        maxPoints: rules.reduce((sum, r) => sum + r.points, 0),
        earnedPoints: 0,
        conditions: rules.map((r) => ({
          description: r.description,
          hint: r.hint,
          points: r.points,
          completed: false,
        })),
      });
    }
  }

  /** Capture initial positions of all dynamic parts for delta-based scoring */
  captureInitialPositions(missions: RenderedMission[]): void {
    this.initialPositions.clear();
    for (const m of missions) {
      for (const p of m.parts) {
        if (p.rigidBody && (p.definition.type === "dynamic" || p.definition.type === "hinge")) {
          const t = p.rigidBody.translation();
          this.initialPositions.set(p.id, { x: t.x, y: t.y, z: t.z });
        }
      }
    }
  }

  /** Check if a part has moved significantly from its initial position */
  hasPartMoved(partId: string, currentPos: { x: number; z: number }, threshold: number = 0.01): boolean {
    // v2: reduced default threshold from 0.02 to 0.01 for easier detection
    const init = this.initialPositions.get(partId);
    if (!init) return true; // If no initial position, assume moved
    const dx = currentPos.x - init.x;
    const dz = currentPos.z - init.z;
    return Math.sqrt(dx * dx + dz * dz) > threshold;
  }

  /** Start the match */
  start(): void {
    if (this.matchPhase === "idle") {
      this.matchPhase = "running";
      this.lastTickTime = performance.now();
      this.scoringGraceFrames = ScoringEngine.GRACE_FRAMES;
    }
  }

  /** Stop/pause the match */
  stop(): void {
    if (this.matchPhase === "running") {
      this.matchPhase = "idle";
    }
  }

  /** Reset the match to initial state */
  reset(): void {
    this.matchPhase = "idle";
    this.timeRemaining = MATCH_DURATION_SECONDS;
    this.lastTickTime = 0;
    this.recentEvents = [];
    this.completedEvents = [];
    Array.from(this.missionScores.values()).forEach((ms) => {
      ms.earnedPoints = 0;
      ms.conditions.forEach((c) => {
        c.completed = false;
      });
    });
  }

  /**
   * Tick the scoring engine — call every frame during the render loop.
   */
  tick(missions: RenderedMission[], world: RAPIER.World): void {
    if (this.matchPhase !== "running") return;

    const now = performance.now();
    if (this.lastTickTime > 0) {
      const elapsed = (now - this.lastTickTime) / 1000;
      this.timeRemaining = Math.max(0, this.timeRemaining - elapsed);
    }
    this.lastTickTime = now;

    if (this.timeRemaining <= 0) {
      this.matchPhase = "ended";
      return;
    }

    if (this.scoringGraceFrames > 0) {
      this.scoringGraceFrames--;
      if (this.scoringGraceFrames === 0) {
        this.captureInitialPositions(missions);
      }
      return;
    }

    // Clean up old recent events (older than 4 seconds) — for transient notifications
    const eventCutoff = now - 4000;
    this.recentEvents = this.recentEvents.filter((e) => e.timestamp > eventCutoff);

    for (const mission of missions) {
      const scoreState = this.missionScores.get(mission.id);
      if (!scoreState) continue;

      // Skip physics-based scoring for Category B (trigger) missions.
      // These are scored exclusively via triggerMissionAction() on E key press.
      if (TRIGGER_MISSION_IDS.has(mission.id)) continue;

      // Category A (push) missions: check physics conditions every frame
      const rules = MISSION_SCORING_RULES[mission.id] ?? [];
      for (let i = 0; i < rules.length; i++) {
        if (scoreState.conditions[i] && !scoreState.conditions[i].completed) {
          if (rules[i].requiresMovement) {
            const part = mission.parts.find((p) => p.id === rules[i].requiresMovement);
            if (part?.rigidBody) {
              const pos = part.rigidBody.translation();
              if (!this.hasPartMoved(rules[i].requiresMovement!, { x: pos.x, z: pos.z })) {
                continue;
              }
            }
          }
          const met = rules[i].check(mission.parts, world);
          if (met) {
            scoreState.conditions[i].completed = true;
            scoreState.earnedPoints += rules[i].points;
            // Add score event for UI notification
            const evt: ScoreEvent = {
              missionId: mission.id,
              description: rules[i].description,
              points: rules[i].points,
              timestamp: now,
            };
            this.recentEvents.push(evt);
            this.completedEvents.push(evt);
            if (this.recentEvents.length > ScoringEngine.MAX_EVENTS) {
              this.recentEvents.shift();
            }
          }
        }
      }
    }
  }

  /** Get the current match state for React rendering */
  getState(): MatchState {
    let totalScore = 0;
    const missionStates: MissionScoreState[] = [];

    Array.from(this.missionScores.values()).forEach((ms) => {
      totalScore += ms.earnedPoints;
      missionStates.push({
        ...ms,
        conditions: ms.conditions.map((c: { description: string; hint: string; points: number; completed: boolean }) => ({ ...c })),
      });
    });

    return {
      phase: this.matchPhase,
      timeRemaining: this.timeRemaining,
      totalScore,
      missions: missionStates,
      recentEvents: [...this.recentEvents],
      completedEvents: [...this.completedEvents],
    };
  }

  /**
   * Trigger the next uncompleted condition for a Category B mission.
   * Called when the player presses E near an interactable mission.
   * Returns the score event if successful, or null if no condition to complete.
   */
  triggerMissionAction(missionId: string): ScoreEvent | null {
    if (this.matchPhase !== "running") return null;

    const scoreState = this.missionScores.get(missionId);
    if (!scoreState) return null;

    const rules = MISSION_SCORING_RULES[missionId] ?? [];

    // Find the first uncompleted condition and complete it
    for (let i = 0; i < rules.length; i++) {
      if (scoreState.conditions[i] && !scoreState.conditions[i].completed) {
        scoreState.conditions[i].completed = true;
        scoreState.earnedPoints += rules[i].points;

        const evt: ScoreEvent = {
          missionId,
          description: rules[i].description,
          points: rules[i].points,
          timestamp: performance.now(),
        };
        this.recentEvents.push(evt);
        this.completedEvents.push(evt);
        if (this.recentEvents.length > ScoringEngine.MAX_EVENTS) {
          this.recentEvents.shift();
        }
        return evt;
      }
    }

    return null; // All conditions already completed
  }

  /** Format time remaining as MM:SS */
  static formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
}
