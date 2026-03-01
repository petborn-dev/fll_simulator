/**
 * FLL SUBMERGED — Scoring Engine (Phase 4)
 *
 * Manages match state (idle → running → ended), 2:30 countdown timer,
 * per-mission scoring rules, and collision-based completion detection.
 *
 * Scoring rules are simplified approximations of the official FLL
 * SUBMERGED 2024-25 rulebook. Each mission has one or more scoring
 * conditions checked against the physics state every frame.
 */

import type { RenderedMission, RenderedMissionPart } from "./missionRenderer";
import RAPIER from "@dimforge/rapier3d-compat";

// ─── Match Constants ───────────────────────────────────────────────
export const MATCH_DURATION_SECONDS = 150; // 2 minutes 30 seconds

export type MatchPhase = "idle" | "running" | "ended";

// ─── Scoring Condition Types ───────────────────────────────────────
export interface ScoringCondition {
  /** Human-readable description */
  description: string;
  /** Points awarded when this condition is met */
  points: number;
  /** Check function: receives the mission's rendered parts and returns true if condition is met */
  check: (parts: RenderedMissionPart[], world: RAPIER.World) => boolean;
  /** Optional: part ID that must have moved from initial position before this condition can score */
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
    points: number;
    completed: boolean;
  }[];
}

// ─── Match State ───────────────────────────────────────────────────
export interface MatchState {
  phase: MatchPhase;
  timeRemaining: number; // seconds remaining
  totalScore: number;
  missions: MissionScoreState[];
}

// ─── Scoring Rules per Mission ─────────────────────────────────────
// Each mission has conditions that check physics state.
// We use part positions and overlaps to determine completion.

function distXZ(a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
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
    // Fallback: compute angle from body rotation
    if (part.rigidBody) {
      const rot = part.rigidBody.rotation();
      // Extract rotation around the hinge axis (simplified)
      const sinAngle = 2 * (rot.w * rot.x + rot.y * rot.z);
      return Math.asin(Math.max(-1, Math.min(1, sinAngle)));
    }
    return 0;
  } catch {
    return null;
  }
}

/**
 * Define scoring conditions for each mission.
 * These are simplified versions of the official rules.
 */
const MISSION_SCORING_RULES: Record<string, ScoringCondition[]> = {
  // M01: Coral Nursery — coral tree near support + buds flipped up
  M01: [
    {
      description: "Coral tree is on the support",
      points: 30,
      check: (parts) => {
        const tree = getPartPosition(parts, "M01_tree");
        const support = getPartPosition(parts, "M01_support");
        if (!tree || !support) return false;
        // Tree should be close to support horizontally and elevated
        return distXZ(tree, support) < 0.04 && tree.y > 0.04;
      },
    },
    {
      description: "Coral buds are flipped up",
      points: 20,
      check: (parts) => {
        const angle = getHingeAngle(parts, "M01_buds");
        if (angle === null) return false;
        // Buds should be rotated at least 45 degrees
        return angle > Math.PI / 4;
      },
    },
  ],

  // M02: Shark — shark pushed into habitat zone
  M02: [
    {
      description: "Shark is in the habitat",
      points: 30,
      check: (parts) => {
        const shark = getPartPosition(parts, "M02_shark");
        const habitat = getTriggerCenter(parts, "M02_habitat");
        if (!shark || !habitat) return false;
        // Shark must be within the habitat trigger zone
        return distXZ(shark, habitat) < 0.08;
      },
    },
  ],

  // M03: Coral Reef — reef panel flipped up + segments still standing
  M03: [
    {
      description: "Coral reef panel is raised",
      points: 20,
      check: (parts) => {
        const angle = getHingeAngle(parts, "M03_reef");
        if (angle === null) return false;
        return angle > Math.PI / 4;
      },
    },
    {
      description: "Reef segments still standing",
      points: 15,
      check: (parts) => {
        // Both segments should still be upright (Y > 0.015)
        // This condition is only checked when the reef panel is raised (first condition met)
        const angle = getHingeAngle(parts, "M03_reef");
        if (angle === null || angle <= Math.PI / 4) return false; // reef must be raised first
        const seg1 = getPartPosition(parts, "M03_seg1");
        const seg2 = getPartPosition(parts, "M03_seg2");
        if (!seg1 || !seg2) return false;
        return seg1.y > 0.015 && seg2.y > 0.015;
      },
    },
  ],

  // M05: Angler Fish — fish pushed into wreck target zone
  M05: [
    {
      description: "Angler fish is in the shipwreck",
      points: 30,
      check: (parts) => {
        const fish = getPartPosition(parts, "M05_fish");
        const target = getTriggerCenter(parts, "M05_target");
        if (!fish || !target) return false;
        return distXZ(fish, target) < 0.06;
      },
    },
  ],

  // M06: Raise the Mast — mast raised upright
  M06: [
    {
      description: "Mast is raised upright",
      points: 30,
      check: (parts) => {
        const angle = getHingeAngle(parts, "M06_mast");
        if (angle === null) return false;
        // Mast hinge limits: -PI/2 to 0. Raised = angle near -PI/2
        return angle < -Math.PI / 4;
      },
    },
  ],

  // M08: Artificial Habitat — segments pushed into target zone
  M08: [
    {
      description: "At least 2 segments in target zone",
      points: 20,
      check: (parts) => {
        const target = getTriggerCenter(parts, "M08_target");
        if (!target) return false;
        let count = 0;
        for (const segId of ["M08_seg1", "M08_seg2", "M08_seg3", "M08_seg4"]) {
          const seg = getPartPosition(parts, segId);
          if (seg && distXZ(seg, target) < 0.08) count++;
        }
        return count >= 2;
      },
    },
    {
      description: "All 4 segments in target zone",
      points: 20,
      check: (parts) => {
        const target = getTriggerCenter(parts, "M08_target");
        if (!target) return false;
        let count = 0;
        for (const segId of ["M08_seg1", "M08_seg2", "M08_seg3", "M08_seg4"]) {
          const seg = getPartPosition(parts, segId);
          if (seg && distXZ(seg, target) < 0.08) count++;
        }
        return count >= 4;
      },
    },
  ],

  // M11: Sonar Discovery — whale panels opened
  M11: [
    {
      description: "Whale panel 1 opened",
      points: 15,
      check: (parts) => {
        const angle = getHingeAngle(parts, "M11_whale1");
        if (angle === null) return false;
        return angle > Math.PI / 6;
      },
    },
    {
      description: "Whale panel 2 opened",
      points: 15,
      check: (parts) => {
        const angle = getHingeAngle(parts, "M11_whale2");
        if (angle === null) return false;
        return angle < -Math.PI / 6;
      },
    },
  ],

  // M13: Change Shipping Lanes — cargo ship pushed to lane 2
  M13: [
    {
      description: "Cargo ship moved to lane 2",
      points: 20,
      check: (parts) => {
        const ship = getPartPosition(parts, "M13_ship");
        const target = getTriggerCenter(parts, "M13_target");
        if (!ship || !target) return false;
        // Ship must have moved from its initial position AND be in the target zone
        // Use a larger threshold since ship needs to physically travel to lane 2
        return distXZ(ship, target) < 0.08;
      },
      requiresMovement: "M13_ship",
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
  private scoringGraceFrames: number = 0; // skip first N ticks to let physics settle
  private static readonly GRACE_FRAMES = 30; // ~0.5 seconds at 60fps

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
  hasPartMoved(partId: string, currentPos: { x: number; z: number }, threshold: number = 0.02): boolean {
    const init = this.initialPositions.get(partId);
    if (!init) return true; // if no initial position, assume moved
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
    // Reset all mission scores
    Array.from(this.missionScores.values()).forEach((ms) => {
      ms.earnedPoints = 0;
      ms.conditions.forEach((c) => {
        c.completed = false;
      });
    });
  }

  /**
   * Tick the scoring engine — call every frame during the render loop.
   * Updates the timer and checks scoring conditions.
   */
  tick(missions: RenderedMission[], world: RAPIER.World): void {
    if (this.matchPhase !== "running") return;

    // Update timer
    const now = performance.now();
    if (this.lastTickTime > 0) {
      const elapsed = (now - this.lastTickTime) / 1000;
      this.timeRemaining = Math.max(0, this.timeRemaining - elapsed);
    }
    this.lastTickTime = now;

    // Check if time is up
    if (this.timeRemaining <= 0) {
      this.matchPhase = "ended";
      return;
    }

    // Grace period: skip scoring for the first N frames to let physics settle
    if (this.scoringGraceFrames > 0) {
      this.scoringGraceFrames--;
      // Capture initial positions on the last grace frame
      if (this.scoringGraceFrames === 0) {
        this.captureInitialPositions(missions);
      }
      return;
    }

    // Check scoring conditions for each mission
    for (const mission of missions) {
      const scoreState = this.missionScores.get(mission.id);
      if (!scoreState) continue;

      const rules = MISSION_SCORING_RULES[mission.id] ?? [];
      for (let i = 0; i < rules.length; i++) {
        if (scoreState.conditions[i] && !scoreState.conditions[i].completed) {
          // If this condition requires a part to have moved, check that first
          if (rules[i].requiresMovement) {
            const part = mission.parts.find((p) => p.id === rules[i].requiresMovement);
            if (part?.rigidBody) {
              const pos = part.rigidBody.translation();
              if (!this.hasPartMoved(rules[i].requiresMovement!, { x: pos.x, z: pos.z })) {
                continue; // Part hasn't moved yet, skip this condition
              }
            }
          }
          const met = rules[i].check(mission.parts, world);
          if (met) {
            scoreState.conditions[i].completed = true;
            scoreState.earnedPoints += rules[i].points;
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
        conditions: ms.conditions.map((c: { description: string; points: number; completed: boolean }) => ({ ...c })),
      });
    });

    return {
      phase: this.matchPhase,
      timeRemaining: this.timeRemaining,
      totalScore,
      missions: missionStates,
    };
  }

  /** Format time remaining as MM:SS */
  static formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
}
