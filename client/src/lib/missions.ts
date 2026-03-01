/**
 * FLL SUBMERGED 2024-2025 — Mission Definitions (All 15 Missions)
 * 
 * Each mission is defined as a data structure containing:
 * - Position on the field (in meters, field center = 0,0)
 * - Geometry description for simplified 3D representation
 * - Physics properties (static, dynamic, hinged, trigger)
 * - Scoring conditions
 * 
 * Field coordinate system (matches screen orientation):
 *   X: left(-) to right(+), range: -1.181 to +1.181
 *   Z: back(+) to front(-), range: +0.5715 (top of screen) to -0.5715 (bottom)
 *   Y: up, ground = 0
 *   Front of field (launch areas) = -Z = bottom of screen
 *   Back of field (far missions) = +Z = top of screen
 * 
 * Compound models converted from GearsBot FLL2024.json with axis correction:
 *   GearsBot [X, Y, Z] -> Our [X, Z_gears_as_Y, Y_gears_as_Z]
 *   Sizes also axis-swapped accordingly
 */

export type MissionPartType = "static" | "dynamic" | "hinge" | "trigger";

/** A sub-shape within a compound MissionPart */
export interface CompoundChild {
  shape: "box" | "cylinder" | "sphere";
  size: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number }; // relative to parent part center
  rotation?: { x: number; y: number; z: number }; // euler angles in radians
  color: { r: number; g: number; b: number };
}

export interface MissionPart {
  id: string;
  type: MissionPartType;
  shape: "box" | "cylinder" | "sphere";
  size: { x: number; y: number; z: number }; // width, height, depth (or radius for cylinder/sphere)
  position: { x: number; y: number; z: number }; // relative to mission origin
  rotation?: { x: number; y: number; z: number }; // euler angles in radians
  color: { r: number; g: number; b: number };
  mass?: number; // only for dynamic/hinge parts
  friction?: number;
  restitution?: number;
  hingeAxis?: "x" | "y" | "z"; // for hinge type
  hingeLimits?: { min: number; max: number }; // radians
  hingeAnchorOffset?: { x: number; y: number; z: number }; // offset from part center to hinge pivot
  hingeDamping?: number; // angular damping for the hinge body
  label?: string; // display name for HUD
  /** Optional compound children — if present, the part is rendered as a group of sub-shapes */
  children?: CompoundChild[];
}

export interface MissionDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  position: { x: number; z: number }; // field position
  parts: MissionPart[];
  maxPoints: number;
}

// Field dimensions for reference
const FW = 2.362; // field width
const FD = 1.143; // field depth
const HW = FW / 2; // half width = 1.181
const HD = FD / 2; // half depth = 0.5715

/**
 * SUBMERGED Mission Definitions — All 15 Missions
 * Positions are approximate based on the official field layout.
 * Front of field (launch areas) = -Z = bottom of screen
 */
export const SUBMERGED_MISSIONS: MissionDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // M01: Coral Nursery — GearsBot Object 0 (24 visual parts)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M01",
    name: "Coral Nursery",
    shortName: "Coral",
    description: "Hang the coral tree on its support and flip the coral buds up.",
    position: { x: -0.9, z: -0.06 },
    maxPoints: 50,
    parts: [
      {
        id: "M01_compound",
        type: "static",
        shape: "box",
        size: { x: 0.148, y: 0.192, z: 0.132 },
        position: { x: 0, y: 0.096, z: 0 },
        color: { r: 0.5, g: 0.5, b: 0.5 },
        label: "Coral Nursery",
        children: [
          { shape: "box", size: { x: 0.04, y: 0.008, z: 0.056 }, position: { x: 0, y: -0.096, z: 0 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.024, y: 0.008, z: 0.008 }, position: { x: 0.0, y: -0.096, z: -0.032 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.024, y: 0.008, z: 0.024 }, position: { x: -0.032, y: -0.096, z: 0.008 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.024, y: 0.008, z: 0.024 }, position: { x: 0.032, y: -0.096, z: 0.008 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.024, y: 0.008, z: 0.016 }, position: { x: 0.0, y: -0.096, z: 0.036 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.032, y: 0.008, z: 0.04 }, position: { x: 0.06, y: -0.096, z: 0.008 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.104, z: 0.008 }, position: { x: 0.0, y: 0.032, z: 0.04 }, color: { r: 0.133, g: 0.404, b: 0.761 } },
          { shape: "box", size: { x: 0.008, y: 0.016, z: 0.008 }, position: { x: 0.0, y: -0.02, z: 0.056 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.008, y: 0.008, z: 0.024 }, position: { x: 0.0, y: -0.008, z: 0.064 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.008, y: 0.016, z: 0.008 }, position: { x: 0.0, y: -0.084, z: 0.04 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.104, z: 0.008 }, position: { x: 0.0, y: -0.048, z: 0.048 }, color: { r: 0.133, g: 0.404, b: 0.761 } },
          { shape: "box", size: { x: 0.008, y: 0.008, z: 0.04 }, position: { x: 0.0, y: 0.0, z: 0.072 }, color: { r: 0.133, g: 0.404, b: 0.761 } },
          { shape: "box", size: { x: 0.008, y: 0.016, z: 0.008 }, position: { x: 0.0, y: 0.076, z: 0.048 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "cylinder", size: { x: 0.036, y: 0.008, z: 0.036 }, position: { x: 0.0, y: 0.08, z: 0.0 }, color: { r: 1.0, g: 0.894, b: 0.0 } },
          { shape: "cylinder", size: { x: 0.004, y: 0.008, z: 0.004 }, position: { x: 0.0, y: 0.088, z: -0.032 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.008, y: 0.024, z: 0.008 }, position: { x: 0.048, y: -0.064, z: 0.008 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.008, y: 0.008, z: 0.008 }, position: { x: 0.048, y: -0.088, z: 0.024 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.008, z: 0.008 }, position: { x: 0.048, y: -0.088, z: -0.008 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.024, y: 0.008, z: 0.024 }, position: { x: 0.088, y: -0.096, z: 0.008 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.016, y: 0.032, z: 0.024 }, position: { x: 0.092, y: -0.076, z: 0.008 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "cylinder", size: { x: 0.008, y: 0.007, z: 0.008 }, position: { x: 0.096, y: -0.052, z: 0.016 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "cylinder", size: { x: 0.008, y: 0.007, z: 0.008 }, position: { x: 0.096, y: -0.052, z: 0.0 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.008, y: 0.008, z: 0.024 }, position: { x: 0.096, y: -0.04, z: 0.008 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.016, z: 0.004 }, position: { x: 0.0, y: 0.004, z: 0.094 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M02: Shark (single box from GearsBot — kept simple)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M02",
    name: "Shark",
    shortName: "Shark",
    description: "Release the shark from its cave into the habitat.",
    position: { x: -0.94, z: 0.43 },
    maxPoints: 30,
    parts: [
      {
        id: "M02_cave",
        type: "static",
        shape: "box",
        size: { x: 0.10, y: 0.06, z: 0.08 },
        position: { x: 0, y: 0.03, z: 0 },
        color: { r: 0.35, g: 0.35, b: 0.4 },
        label: "Shark Cave",
      },
      {
        id: "M02_shark",
        type: "dynamic",
        shape: "box",
        size: { x: 0.04, y: 0.025, z: 0.08 },
        position: { x: 0, y: 0.02, z: 0.06 },
        color: { r: 0.5, g: 0.5, b: 0.55 },
        mass: 0.06,
        friction: 0.3,
        restitution: 0.05,
        label: "Shark",
      },
      {
        id: "M02_habitat",
        type: "trigger",
        shape: "box",
        size: { x: 0.12, y: 0.005, z: 0.12 },
        position: { x: 0.15, y: 0.0025, z: 0 },
        color: { r: 0.2, g: 0.5, b: 0.8 },
        label: "Shark Habitat",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M03: Coral Reef — GearsBot Object 2 (19 visual parts)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M03",
    name: "Coral Reef",
    shortName: "Reef",
    description: "Flip the coral reef structure up without damaging nearby segments.",
    position: { x: -0.35, z: 0.46 },
    maxPoints: 40,
    parts: [
      {
        id: "M03_compound",
        type: "static",
        shape: "box",
        size: { x: 0.136, y: 0.136, z: 0.136 },
        position: { x: 0, y: 0.068, z: 0 },
        color: { r: 0.5, g: 0.5, b: 0.5 },
        label: "Coral Reef",
        children: [
          { shape: "cylinder", size: { x: 0.068, y: 0.006, z: 0.068 }, position: { x: 0, y: -0.068, z: 0 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.008, z: 0.012 }, position: { x: 0.0, y: -0.092, z: 0.0 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "cylinder", size: { x: 0.02, y: 0.006, z: 0.02 }, position: { x: 0.016, y: -0.076, z: 0.0 }, color: { r: 0.816, g: 0.741, b: 0.514 } },
          { shape: "cylinder", size: { x: 0.02, y: 0.006, z: 0.02 }, position: { x: 0.0, y: -0.052, z: 0.016 }, color: { r: 0.816, g: 0.741, b: 0.514 } },
          { shape: "cylinder", size: { x: 0.02, y: 0.006, z: 0.02 }, position: { x: -0.016, y: -0.06, z: 0.0 }, color: { r: 0.816, g: 0.741, b: 0.514 } },
          { shape: "cylinder", size: { x: 0.02, y: 0.006, z: 0.02 }, position: { x: 0.016, y: -0.044, z: 0.0 }, color: { r: 0.816, g: 0.741, b: 0.514 } },
          { shape: "cylinder", size: { x: 0.02, y: 0.006, z: 0.02 }, position: { x: 0.0, y: -0.036, z: -0.016 }, color: { r: 0.816, g: 0.741, b: 0.514 } },
          { shape: "cylinder", size: { x: 0.02, y: 0.006, z: 0.02 }, position: { x: -0.016, y: -0.028, z: 0.0 }, color: { r: 0.816, g: 0.741, b: 0.514 } },
          { shape: "cylinder", size: { x: 0.02, y: 0.006, z: 0.02 }, position: { x: 0.0, y: -0.068, z: -0.016 }, color: { r: 0.816, g: 0.741, b: 0.514 } },
          { shape: "cylinder", size: { x: 0.02, y: 0.006, z: 0.02 }, position: { x: 0.0, y: -0.02, z: 0.016 }, color: { r: 0.816, g: 0.741, b: 0.514 } },
          { shape: "cylinder", size: { x: 0.004, y: 0.008, z: 0.004 }, position: { x: 0.0, y: 0.036, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.004, z: 0.012 }, position: { x: -0.016, y: -0.004, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.004, z: 0.012 }, position: { x: 0.0, y: 0.036, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.004, z: 0.012 }, position: { x: 0.0, y: -0.012, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.004, z: 0.012 }, position: { x: 0.024, y: 0.012, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.004, z: 0.012 }, position: { x: -0.024, y: 0.012, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.004, z: 0.012 }, position: { x: 0.016, y: -0.004, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.004, z: 0.012 }, position: { x: 0.016, y: 0.028, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.004, z: 0.012 }, position: { x: -0.016, y: 0.028, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M04: Scuba Diver (no GearsBot model — kept simple)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M04",
    name: "Scuba Diver",
    shortName: "Diver",
    description: "Transport the scuba diver from the coral nursery to the coral reef support.",
    position: { x: -0.83, z: 0.17 },
    maxPoints: 40,
    parts: [
      {
        id: "M04_diver",
        type: "dynamic",
        shape: "cylinder",
        size: { x: 0.012, y: 0.04, z: 0.012 },
        position: { x: 0, y: 0.02, z: 0 },
        color: { r: 0.1, g: 0.1, b: 0.8 },
        mass: 0.03,
        friction: 0.5,
        restitution: 0.05,
        label: "Scuba Diver",
      },
      {
        id: "M04_start",
        type: "static",
        shape: "box",
        size: { x: 0.06, y: 0.008, z: 0.06 },
        position: { x: 0, y: 0.004, z: 0 },
        color: { r: 0.3, g: 0.3, b: 0.6 },
        label: "Diver Start",
      },
      {
        id: "M04_reef_target",
        type: "trigger",
        shape: "box",
        size: { x: 0.10, y: 0.005, z: 0.10 },
        position: { x: 1.15, y: 0.0025, z: 0.20 },
        color: { r: 0.2, g: 0.6, b: 0.8 },
        label: "Reef Support Zone",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M05: Angler Fish — GearsBot Objects 4+5 (3 parts each)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M05",
    name: "Angler Fish",
    shortName: "Angler",
    description: "Push the angler fish into the shipwreck through the gate.",
    position: { x: 0.0, z: -0.06 },
    maxPoints: 30,
    parts: [
      {
        id: "M05_wreck",
        type: "static",
        shape: "box",
        size: { x: 0.14, y: 0.08, z: 0.10 },
        position: { x: 0, y: 0.04, z: 0 },
        color: { r: 0.4, g: 0.3, b: 0.2 },
        label: "Shipwreck",
      },
      {
        id: "M05_fishA",
        type: "dynamic",
        shape: "box",
        size: { x: 0.032, y: 0.056, z: 0.024 },
        position: { x: -0.12, y: 0.028, z: 0 },
        color: { r: 0.5, g: 0.5, b: 0.5 },
        mass: 0.04,
        friction: 0.3,
        restitution: 0.05,
        label: "Angler Fish A",
        children: [
          { shape: "cylinder", size: { x: 0.012, y: 0.024, z: 0.012 }, position: { x: 0, y: 0, z: 0 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.032, y: 0.032, z: 0.008 }, position: { x: 0.0, y: 0.028, z: 0.0 }, color: { r: 0.992, g: 0.416, b: 0.588 } },
          { shape: "sphere", size: { x: 0.0115, y: 0.0115, z: 0.0115 }, position: { x: 0.0, y: -0.003, z: 0.0 }, color: { r: 0.549, g: 0.851, b: 0.953 } },
        ],
      },
      {
        id: "M05_fishB",
        type: "dynamic",
        shape: "box",
        size: { x: 0.032, y: 0.056, z: 0.024 },
        position: { x: -0.20, y: 0.028, z: 0 },
        color: { r: 0.5, g: 0.5, b: 0.5 },
        mass: 0.04,
        friction: 0.3,
        restitution: 0.05,
        label: "Angler Fish B",
        children: [
          { shape: "cylinder", size: { x: 0.012, y: 0.024, z: 0.012 }, position: { x: 0, y: 0, z: 0 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.032, y: 0.032, z: 0.008 }, position: { x: 0.0, y: 0.028, z: 0.0 }, color: { r: 0.639, g: 0.275, b: 0.549 } },
          { shape: "sphere", size: { x: 0.0115, y: 0.0115, z: 0.0115 }, position: { x: 0.0, y: -0.003, z: 0.0 }, color: { r: 0.549, g: 0.851, b: 0.953 } },
        ],
      },
      {
        id: "M05_gate",
        type: "hinge",
        shape: "box",
        size: { x: 0.01, y: 0.06, z: 0.08 },
        position: { x: -0.075, y: 0.04, z: 0 },
        color: { r: 0.5, g: 0.4, b: 0.25 },
        mass: 0.015,
        hingeAxis: "y",
        hingeLimits: { min: 0, max: Math.PI / 2 },
        hingeAnchorOffset: { x: 0, y: -0.03, z: 0 },
        hingeDamping: 0.5,
        label: "Gate",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M06: Raise the Mast — GearsBot Object 3 (16 visual parts)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M06",
    name: "Raise the Mast",
    shortName: "Mast",
    description: "Push the mast upright to raise the flag.",
    position: { x: -0.55, z: 0.30 },
    maxPoints: 30,
    parts: [
      {
        id: "M06_compound",
        type: "static",
        shape: "box",
        size: { x: 0.108, y: 0.160, z: 0.156 },
        position: { x: 0, y: 0.08, z: 0 },
        color: { r: 0.5, g: 0.5, b: 0.5 },
        label: "Mast Assembly",
        children: [
          { shape: "box", size: { x: 0.088, y: 0.008, z: 0.008 }, position: { x: 0, y: -0.08, z: 0 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.008, z: 0.104 }, position: { x: 0.04, y: -0.08, z: -0.056 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.088, y: 0.008, z: 0.008 }, position: { x: 0.0, y: -0.08, z: -0.112 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.008, z: 0.104 }, position: { x: -0.04, y: -0.08, z: -0.056 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.024, y: 0.152, z: 0.016 }, position: { x: 0.0, y: -0.008, z: 0.004 }, color: { r: 0.192, g: 0.741, b: 0.365 } },
          { shape: "box", size: { x: 0.024, y: 0.016, z: 0.016 }, position: { x: 0.0, y: 0.06, z: -0.012 }, color: { r: 0.192, g: 0.741, b: 0.365 } },
          { shape: "cylinder", size: { x: 0.024, y: 0.008, z: 0.024 }, position: { x: -0.024, y: -0.052, z: 0.0 }, color: { r: 0.502, g: 0.902, b: 0.502 } },
          { shape: "cylinder", size: { x: 0.016, y: 0.008, z: 0.016 }, position: { x: 0.04, y: -0.06, z: 0.0 }, color: { r: 0.502, g: 0.902, b: 0.502 } },
          { shape: "box", size: { x: 0.016, y: 0.008, z: 0.024 }, position: { x: 0.028, y: -0.08, z: -0.048 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.016, y: 0.008, z: 0.024 }, position: { x: -0.028, y: -0.08, z: -0.048 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.032, z: 0.008 }, position: { x: -0.024, y: -0.06, z: -0.056 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.032, z: 0.008 }, position: { x: 0.024, y: -0.06, z: -0.056 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.016, y: 0.008, z: 0.056 }, position: { x: -0.044, y: -0.08, z: -0.104 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.008, z: 0.056 }, position: { x: 0.048, y: -0.08, z: -0.088 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "cylinder", size: { x: 0.04, y: 0.008, z: 0.04 }, position: { x: 0.0, y: 0.064, z: -0.06 }, color: { r: 1.0, g: 0.894, b: 0.0 } },
          { shape: "cylinder", size: { x: 0.004, y: 0.008, z: 0.004 }, position: { x: 0.0, y: 0.072, z: -0.096 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M07: Kraken's Treasure — GearsBot Object 7 (15 visual parts)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M07",
    name: "Kraken's Treasure",
    shortName: "Kraken",
    description: "Retrieve the treasure chest from the kraken's nest.",
    position: { x: -0.94, z: 0.20 },
    maxPoints: 30,
    parts: [
      {
        id: "M07_compound",
        type: "static",
        shape: "box",
        size: { x: 0.120, y: 0.096, z: 0.129 },
        position: { x: 0, y: 0.048, z: 0 },
        color: { r: 0.4, g: 0.4, b: 0.4 },
        label: "Kraken's Nest",
        children: [
          { shape: "box", size: { x: 0.088, y: 0.008, z: 0.056 }, position: { x: 0, y: -0.048, z: 0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.008, y: 0.024, z: 0.024 }, position: { x: -0.04, y: -0.032, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.064, y: 0.008, z: 0.024 }, position: { x: 0.012, y: -0.048, z: 0.04 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.088, z: 0.064 }, position: { x: 0.048, y: -0.008, z: 0.036 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.016, y: 0.04, z: 0.024 }, position: { x: 0.06, y: -0.032, z: 0.048 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.024, y: 0.04, z: 0.016 }, position: { x: 0.064, y: -0.032, z: 0.068 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.032, z: 0.008 }, position: { x: -0.016, y: -0.036, z: 0.056 }, color: { r: 0.678, g: 0.847, b: 0.286 } },
          { shape: "box", size: { x: 0.024, y: 0.024, z: 0.008 }, position: { x: 0.016, y: 0.016, z: 0.072 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.024, y: 0.04, z: 0.016 }, position: { x: 0.04, y: 0.024, z: 0.076 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.048, y: 0.056, z: 0.016 }, position: { x: 0.028, y: -0.024, z: 0.068 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.024, y: 0.064, z: 0.008 }, position: { x: 0.0, y: -0.02, z: 0.056 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.032, z: 0.08 }, position: { x: 0.04, y: -0.028, z: 0.012 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "cylinder", size: { x: 0.004, y: 0.008, z: 0.004 }, position: { x: 0.055, y: -0.032, z: -0.041 }, color: { r: 0.678, g: 0.847, b: 0.286 } },
        ],
      },
      {
        id: "M07_chest",
        type: "dynamic",
        shape: "box",
        size: { x: 0.04, y: 0.03, z: 0.03 },
        position: { x: 0.03, y: 0.015, z: 0.02 },
        color: { r: 0.7, g: 0.5, b: 0.1 },
        mass: 0.05,
        friction: 0.4,
        restitution: 0.05,
        label: "Treasure Chest",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M08: Artificial Habitat — GearsBot Object 8 (6 visual parts)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M08",
    name: "Artificial Habitat",
    shortName: "Habitat",
    description: "Stack the habitat segments to build the artificial reef.",
    position: { x: -0.94, z: 0.10 },
    maxPoints: 40,
    parts: [
      {
        id: "M08_compound",
        type: "dynamic",
        shape: "box",
        size: { x: 0.108, y: 0.020, z: 0.088 },
        position: { x: 0, y: 0.058, z: 0 },
        color: { r: 0.643, g: 0.643, b: 0.643 },
        mass: 0.06,
        friction: 0.6,
        restitution: 0.02,
        label: "Habitat Assembly",
        children: [
          { shape: "box", size: { x: 0.088, y: 0.016, z: 0.024 }, position: { x: 0, y: 0, z: 0 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.016, y: 0.008, z: 0.008 }, position: { x: 0.02, y: -0.004, z: -0.016 }, color: { r: 0.973, g: 0.976, b: 0.984 } },
          { shape: "box", size: { x: 0.016, y: 0.008, z: 0.008 }, position: { x: 0.02, y: -0.004, z: 0.016 }, color: { r: 0.973, g: 0.976, b: 0.984 } },
          { shape: "box", size: { x: 0.016, y: 0.008, z: 0.032 }, position: { x: -0.008, y: 0.0, z: -0.028 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.016, y: 0.008, z: 0.032 }, position: { x: -0.008, y: 0.0, z: 0.028 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.024, y: 0.008, z: 0.008 }, position: { x: 0.052, y: 0.008, z: 0.0 }, color: { r: 0.973, g: 0.976, b: 0.984 } },
        ],
      },
      {
        id: "M08_target",
        type: "trigger",
        shape: "box",
        size: { x: 0.10, y: 0.005, z: 0.10 },
        position: { x: 0.12, y: 0.0025, z: 0 },
        color: { r: 0.7, g: 0.6, b: 0.1 },
        label: "Habitat Target",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M09: Unexpected Encounter — GearsBot Object 6 (3 visual parts)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M09",
    name: "Unexpected Encounter",
    shortName: "Creature",
    description: "Release the unknown creature from the AUV and deliver it to the cold seep.",
    position: { x: 0.28, z: -0.11 },
    maxPoints: 30,
    parts: [
      {
        id: "M09_auv",
        type: "static",
        shape: "box",
        size: { x: 0.032, y: 0.056, z: 0.024 },
        position: { x: 0, y: 0.028, z: 0 },
        color: { r: 0.5, g: 0.5, b: 0.5 },
        label: "AUV",
        children: [
          { shape: "cylinder", size: { x: 0.012, y: 0.024, z: 0.012 }, position: { x: 0, y: 0, z: 0 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.032, y: 0.032, z: 0.008 }, position: { x: 0.0, y: 0.028, z: 0.0 }, color: { r: 0.208, g: 0.357, b: 0.243 } },
          { shape: "sphere", size: { x: 0.0115, y: 0.0115, z: 0.0115 }, position: { x: 0.0, y: -0.003, z: 0.0 }, color: { r: 0.549, g: 0.851, b: 0.953 } },
        ],
      },
      {
        id: "M09_creature",
        type: "dynamic",
        shape: "sphere",
        size: { x: 0.018, y: 0.018, z: 0.018 },
        position: { x: 0, y: 0.055, z: 0 },
        color: { r: 0.8, g: 0.2, b: 0.6 },
        mass: 0.025,
        friction: 0.4,
        restitution: 0.1,
        label: "Unknown Creature",
      },
      {
        id: "M09_coldseep",
        type: "trigger",
        shape: "box",
        size: { x: 0.10, y: 0.005, z: 0.10 },
        position: { x: -0.15, y: 0.0025, z: 0.08 },
        color: { r: 0.3, g: 0.2, b: 0.5 },
        label: "Cold Seep Zone",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M10: Send Over the Submersible — GearsBot Object 9 (15 visual parts)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M10",
    name: "Send Over the Submersible",
    shortName: "Submersible",
    description: "Lower the yellow flag and send the submersible toward the opposing field.",
    position: { x: 0.12, z: 0.4 },
    maxPoints: 40,
    parts: [
      {
        id: "M10_compound",
        type: "static",
        shape: "box",
        size: { x: 0.080, y: 0.099, z: 0.032 },
        position: { x: 0, y: 0.05, z: 0 },
        color: { r: 0.3, g: 0.3, b: 0.3 },
        label: "Submersible Assembly",
        children: [
          { shape: "box", size: { x: 0.016, y: 0.008, z: 0.008 }, position: { x: 0, y: -0.05, z: 0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.004, y: 0.008, z: 0.004 }, position: { x: 0.0, y: -0.042, z: -0.008 }, color: { r: 0.996, g: 0.886, b: 0.0 } },
          { shape: "box", size: { x: 0.02, y: 0.016, z: 0.008 }, position: { x: 0.0, y: -0.054, z: -0.008 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.016, y: 0.016, z: 0.008 }, position: { x: 0.0, y: -0.07, z: -0.008 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.004, y: 0.008, z: 0.004 }, position: { x: 0.0, y: -0.042, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.006, z: 0.012 }, position: { x: 0.0, y: -0.042, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.006, z: 0.012 }, position: { x: -0.02, y: -0.034, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.006, z: 0.012 }, position: { x: -0.028, y: -0.014, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.006, z: 0.012 }, position: { x: -0.02, y: 0.006, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.006, z: 0.012 }, position: { x: 0.0, y: 0.014, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.006, z: 0.012 }, position: { x: 0.02, y: 0.006, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.006, z: 0.012 }, position: { x: 0.028, y: -0.014, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.012, y: 0.006, z: 0.012 }, position: { x: 0.02, y: -0.034, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.016, y: 0.004, z: 0.016 }, position: { x: 0.0, y: -0.08, z: -0.012 }, color: { r: 0.949, g: 0.549, b: 0.176 } },
          { shape: "box", size: { x: 0.016, y: 0.016, z: 0.004 }, position: { x: 0.0, y: -0.054, z: 0.006 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
        ],
      },
      {
        id: "M10_sub",
        type: "dynamic",
        shape: "box",
        size: { x: 0.05, y: 0.025, z: 0.03 },
        position: { x: 0.06, y: 0.02, z: 0 },
        color: { r: 0.9, g: 0.8, b: 0.1 },
        mass: 0.05,
        friction: 0.3,
        restitution: 0.05,
        label: "Submersible",
      },
      {
        id: "M10_opposing",
        type: "trigger",
        shape: "box",
        size: { x: 0.15, y: 0.005, z: 0.10 },
        position: { x: 0.25, y: 0.0025, z: 0 },
        color: { r: 0.5, g: 0.5, b: 0.2 },
        label: "Opposing Field Zone",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M11: Sonar Discovery — GearsBot Object 10 (20 visual parts)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M11",
    name: "Sonar Discovery",
    shortName: "Sonar",
    description: "Push the panels to reveal hidden whales.",
    position: { x: 0.59, z: 0.4 },
    maxPoints: 30,
    parts: [
      {
        id: "M11_compound",
        type: "static",
        shape: "box",
        size: { x: 0.212, y: 0.128, z: 0.116 },
        position: { x: 0, y: 0.064, z: 0 },
        color: { r: 0.4, g: 0.4, b: 0.4 },
        label: "Sonar Assembly",
        children: [
          { shape: "box", size: { x: 0.032, y: 0.008, z: 0.088 }, position: { x: 0, y: -0.064, z: 0 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.032, y: 0.008, z: 0.08 }, position: { x: 0.024, y: -0.064, z: 0.012 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.04, y: 0.088, z: 0.008 }, position: { x: 0.028, y: -0.016, z: 0.008 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.04, z: 0.04 }, position: { x: 0.004, y: -0.04, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.008, y: 0.04, z: 0.04 }, position: { x: 0.052, y: -0.04, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.008, y: 0.032, z: 0.008 }, position: { x: 0.028, y: -0.02, z: -0.02 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.016, y: 0.088, z: 0.008 }, position: { x: 0.016, y: -0.02, z: -0.02 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.016, y: 0.088, z: 0.008 }, position: { x: 0.04, y: -0.02, z: -0.02 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.032, z: 0.008 }, position: { x: 0.02, y: 0.02, z: -0.052 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.032, z: 0.008 }, position: { x: 0.036, y: 0.02, z: -0.052 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.008, y: 0.064, z: 0.088 }, position: { x: -0.004, y: -0.028, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.032, y: 0.048, z: 0.008 }, position: { x: -0.016, y: -0.028, z: 0.048 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.04, y: 0.004, z: 0.056 }, position: { x: -0.04, y: 0.0, z: 0.032 }, color: { r: 0.973, g: 0.976, b: 0.984 } },
          { shape: "box", size: { x: 0.032, y: 0.008, z: 0.016 }, position: { x: 0.056, y: -0.064, z: 0.004 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.04, y: 0.008, z: 0.016 }, position: { x: 0.08, y: -0.052, z: 0.004 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "cylinder", size: { x: 0.04, y: 0.006, z: 0.04 }, position: { x: 0.112, y: -0.01, z: 0.004 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.008, y: 0.032, z: 0.016 }, position: { x: 0.144, y: 0.036, z: 0.0 }, color: { r: 0.192, g: 0.741, b: 0.365 } },
          { shape: "cylinder", size: { x: 0.004, y: 0.008, z: 0.004 }, position: { x: 0.144, y: 0.056, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.104, y: 0.04, z: 0.008 }, position: { x: 0.1, y: -0.016, z: -0.028 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.104, y: 0.04, z: 0.008 }, position: { x: 0.1, y: -0.016, z: 0.04 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M12: Feed the Whale — GearsBot Object 12 (15 visual parts)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M12",
    name: "Feed the Whale",
    shortName: "Whale",
    description: "Collect krill and push them into the whale's mouth.",
    position: { x: 0.94, z: 0.46 },
    maxPoints: 50,
    parts: [
      {
        id: "M12_compound",
        type: "static",
        shape: "box",
        size: { x: 0.140, y: 0.096, z: 0.096 },
        position: { x: 0, y: 0.048, z: 0 },
        color: { r: 0.4, g: 0.4, b: 0.4 },
        label: "Whale Assembly",
        children: [
          { shape: "box", size: { x: 0.056, y: 0.008, z: 0.072 }, position: { x: 0, y: -0.048, z: 0 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "box", size: { x: 0.024, y: 0.008, z: 0.024 }, position: { x: 0.04, y: -0.048, z: 0.0 }, color: { r: 0.443, g: 0.443, b: 0.443 } },
          { shape: "cylinder", size: { x: 0.008, y: 0.008, z: 0.008 }, position: { x: -0.036, y: -0.048, z: -0.024 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "cylinder", size: { x: 0.008, y: 0.008, z: 0.008 }, position: { x: -0.036, y: -0.048, z: 0.024 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.008, y: 0.056, z: 0.008 }, position: { x: 0.008, y: -0.024, z: -0.04 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.008, y: 0.056, z: 0.008 }, position: { x: 0.008, y: -0.024, z: 0.04 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.008, y: 0.016, z: 0.072 }, position: { x: 0.008, y: 0.004, z: 0.0 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.016, y: 0.04, z: 0.008 }, position: { x: -0.004, y: -0.032, z: 0.04 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.008, y: 0.032, z: 0.008 }, position: { x: 0.008, y: 0.028, z: 0.016 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.008, y: 0.008, z: 0.024 }, position: { x: 0.008, y: 0.016, z: 0.0 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.008, y: 0.016, z: 0.008 }, position: { x: 0.008, y: 0.028, z: 0.008 }, color: { r: 0.643, g: 0.643, b: 0.643 } },
          { shape: "box", size: { x: 0.088, y: 0.04, z: 0.008 }, position: { x: -0.04, y: -0.032, z: -0.048 }, color: { r: 0.235, g: 0.235, b: 0.235 } },
          { shape: "box", size: { x: 0.056, y: 0.008, z: 0.008 }, position: { x: 0.024, y: -0.036, z: -0.016 }, color: { r: 0.875, g: 0.004, b: 0.0 } },
          { shape: "box", size: { x: 0.056, y: 0.008, z: 0.008 }, position: { x: 0.024, y: -0.036, z: 0.016 }, color: { r: 0.875, g: 0.004, b: 0.0 } },
          { shape: "box", size: { x: 0.048, y: 0.024, z: 0.04 }, position: { x: 0.032, y: -0.008, z: 0.0 }, color: { r: 0.875, g: 0.004, b: 0.0 } },
        ],
      },
      {
        id: "M12_krill1",
        type: "dynamic",
        shape: "sphere",
        size: { x: 0.01, y: 0.01, z: 0.01 },
        position: { x: -0.15, y: 0.012, z: -0.03 },
        color: { r: 0.95, g: 0.4, b: 0.2 },
        mass: 0.01,
        friction: 0.5,
        restitution: 0.1,
        label: "Krill 1",
      },
      {
        id: "M12_krill2",
        type: "dynamic",
        shape: "sphere",
        size: { x: 0.01, y: 0.01, z: 0.01 },
        position: { x: -0.18, y: 0.012, z: 0.02 },
        color: { r: 0.95, g: 0.4, b: 0.2 },
        mass: 0.01,
        friction: 0.5,
        restitution: 0.1,
        label: "Krill 2",
      },
      {
        id: "M12_krill3",
        type: "dynamic",
        shape: "sphere",
        size: { x: 0.01, y: 0.01, z: 0.01 },
        position: { x: -0.20, y: 0.012, z: -0.01 },
        color: { r: 0.95, g: 0.4, b: 0.2 },
        mass: 0.01,
        friction: 0.5,
        restitution: 0.1,
        label: "Krill 3",
      },
      {
        id: "M12_mouth",
        type: "trigger",
        shape: "box",
        size: { x: 0.06, y: 0.04, z: 0.06 },
        position: { x: -0.08, y: 0.03, z: 0 },
        color: { r: 0.4, g: 0.2, b: 0.3 },
        label: "Whale Mouth",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M13: Change Shipping Lanes (no GearsBot model — kept simple)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M13",
    name: "Change Shipping Lanes",
    shortName: "Ship",
    description: "Push the cargo ship from lane 1 to lane 2.",
    position: { x: 0.9, z: 0.0 },
    maxPoints: 20,
    parts: [
      {
        id: "M13_lane1",
        type: "static",
        shape: "box",
        size: { x: 0.16, y: 0.005, z: 0.005 },
        position: { x: 0, y: 0.0025, z: -0.04 },
        color: { r: 0.3, g: 0.3, b: 0.8 },
        label: "Lane 1",
      },
      {
        id: "M13_lane2",
        type: "static",
        shape: "box",
        size: { x: 0.16, y: 0.005, z: 0.005 },
        position: { x: 0, y: 0.0025, z: 0.04 },
        color: { r: 0.3, g: 0.8, b: 0.3 },
        label: "Lane 2 (Target)",
      },
      {
        id: "M13_ship",
        type: "dynamic",
        shape: "box",
        size: { x: 0.10, y: 0.03, z: 0.04 },
        position: { x: 0, y: 0.025, z: -0.04 },
        color: { r: 0.7, g: 0.2, b: 0.2 },
        mass: 0.08,
        friction: 0.4,
        restitution: 0.05,
        label: "Cargo Ship",
      },
      {
        id: "M13_target",
        type: "trigger",
        shape: "box",
        size: { x: 0.16, y: 0.005, z: 0.06 },
        position: { x: 0, y: 0.0025, z: 0.04 },
        color: { r: 0.2, g: 0.7, b: 0.3 },
        label: "New Lane Zone",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M14: Sample Collection (no GearsBot model — kept simple)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M14",
    name: "Sample Collection",
    shortName: "Samples",
    description: "Collect water, seabed, and plankton samples plus trident pieces from around the field.",
    position: { x: 0.94, z: 0.29 },
    maxPoints: 55,
    parts: [
      {
        id: "M14_water",
        type: "dynamic",
        shape: "cylinder",
        size: { x: 0.012, y: 0.025, z: 0.012 },
        position: { x: -0.06, y: 0.0125, z: 0 },
        color: { r: 0.2, g: 0.5, b: 0.9 },
        mass: 0.015,
        friction: 0.5,
        restitution: 0.05,
        label: "Water Sample",
      },
      {
        id: "M14_water_area",
        type: "trigger",
        shape: "box",
        size: { x: 0.06, y: 0.005, z: 0.06 },
        position: { x: -0.06, y: 0.0025, z: 0 },
        color: { r: 0.2, g: 0.4, b: 0.8 },
        label: "Water Sample Area",
      },
      {
        id: "M14_seabed",
        type: "dynamic",
        shape: "cylinder",
        size: { x: 0.012, y: 0.025, z: 0.012 },
        position: { x: 0, y: 0.0125, z: 0 },
        color: { r: 0.6, g: 0.45, b: 0.25 },
        mass: 0.015,
        friction: 0.5,
        restitution: 0.05,
        label: "Seabed Sample",
      },
      {
        id: "M14_seabed_area",
        type: "trigger",
        shape: "box",
        size: { x: 0.06, y: 0.005, z: 0.06 },
        position: { x: 0, y: 0.0025, z: 0 },
        color: { r: 0.5, g: 0.35, b: 0.15 },
        label: "Seabed Area",
      },
      {
        id: "M14_plankton",
        type: "dynamic",
        shape: "cylinder",
        size: { x: 0.012, y: 0.025, z: 0.012 },
        position: { x: 0.06, y: 0.0125, z: 0 },
        color: { r: 0.2, g: 0.8, b: 0.3 },
        mass: 0.015,
        friction: 0.5,
        restitution: 0.05,
        label: "Plankton Sample",
      },
      {
        id: "M14_kelp_area",
        type: "trigger",
        shape: "box",
        size: { x: 0.06, y: 0.005, z: 0.06 },
        position: { x: 0.06, y: 0.0025, z: 0 },
        color: { r: 0.15, g: 0.6, b: 0.2 },
        label: "Kelp Forest Area",
      },
      {
        id: "M14_trident1",
        type: "dynamic",
        shape: "box",
        size: { x: 0.008, y: 0.04, z: 0.008 },
        position: { x: -0.03, y: 0.02, z: -0.05 },
        color: { r: 0.8, g: 0.7, b: 0.2 },
        mass: 0.02,
        friction: 0.5,
        restitution: 0.05,
        label: "Trident Piece 1",
      },
      {
        id: "M14_trident2",
        type: "dynamic",
        shape: "box",
        size: { x: 0.008, y: 0.04, z: 0.008 },
        position: { x: 0.03, y: 0.02, z: -0.05 },
        color: { r: 0.8, g: 0.7, b: 0.2 },
        mass: 0.02,
        friction: 0.5,
        restitution: 0.05,
        label: "Trident Piece 2",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M15: Research Vessel (no GearsBot model — kept simple)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M15",
    name: "Research Vessel",
    shortName: "Vessel",
    description: "Dock the research vessel and load collected samples, trident parts, and treasure chest.",
    position: { x: -0.35, z: -0.46 },
    maxPoints: 40,
    parts: [
      {
        id: "M15_hull",
        type: "static",
        shape: "box",
        size: { x: 0.14, y: 0.04, z: 0.08 },
        position: { x: 0, y: 0.02, z: 0 },
        color: { r: 0.7, g: 0.7, b: 0.75 },
        label: "Research Vessel",
      },
      {
        id: "M15_cargo",
        type: "trigger",
        shape: "box",
        size: { x: 0.10, y: 0.04, z: 0.06 },
        position: { x: 0, y: 0.04, z: 0 },
        color: { r: 0.3, g: 0.6, b: 0.3 },
        label: "Cargo Area",
      },
      {
        id: "M15_latch",
        type: "hinge",
        shape: "box",
        size: { x: 0.04, y: 0.015, z: 0.01 },
        position: { x: -0.09, y: 0.03, z: 0 },
        color: { r: 0.5, g: 0.5, b: 0.55 },
        mass: 0.015,
        hingeAxis: "y",
        hingeLimits: { min: 0, max: Math.PI / 3 },
        hingeAnchorOffset: { x: 0.02, y: 0, z: 0 },
        hingeDamping: 0.6,
        label: "Port Latch",
      },
    ],
  },
];

/** Get all missions for the current season */
export function getSeasonMissions(): MissionDefinition[] {
  return SUBMERGED_MISSIONS;
}
