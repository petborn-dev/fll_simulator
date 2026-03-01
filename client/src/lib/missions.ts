/**
 * FLL SUBMERGED 2024-2025 — Mission Definitions
 * 
 * Each mission is defined as a data structure containing:
 * - Position on the field (in meters, field center = 0,0)
 * - Geometry description for simplified 3D representation
 * - Physics properties (static, dynamic, hinged)
 * - Scoring conditions
 * 
 * Field coordinate system:
 *   X: left(-) to right(+), range: -1.181 to +1.181
 *   Z: back(-) to front(+), range: -0.5715 to +0.5715
 *   Y: up, ground = 0
 */

export type MissionPartType = "static" | "dynamic" | "hinge" | "trigger";

export interface MissionPart {
  id: string;
  type: MissionPartType;
  shape: "box" | "cylinder" | "sphere";
  size: { x: number; y: number; z: number }; // width, height, depth (or radius for cylinder/sphere)
  position: { x: number; y: number; z: number }; // relative to mission origin
  rotation?: { x: number; y: number; z: number }; // euler angles in radians
  color: { r: number; g: number; b: number };
  mass?: number; // only for dynamic parts
  friction?: number;
  restitution?: number;
  hingeAxis?: "x" | "y" | "z"; // for hinge type
  hingeLimits?: { min: number; max: number }; // radians
  label?: string; // display name for HUD
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
 * SUBMERGED Mission Definitions
 * Positions are approximate based on the official field layout.
 * Missions are distributed across the field with HOME area in bottom-left.
 */
export const SUBMERGED_MISSIONS: MissionDefinition[] = [
  // === M01: Coral Nursery (upper-left area) ===
  {
    id: "M01",
    name: "Coral Nursery",
    shortName: "Coral",
    description: "Hang the coral tree on its support and flip the coral buds up.",
    position: { x: -0.75, z: -0.25 },
    maxPoints: 50,
    parts: [
      // Base platform
      {
        id: "M01_base",
        type: "static",
        shape: "box",
        size: { x: 0.12, y: 0.015, z: 0.10 },
        position: { x: 0, y: 0.0075, z: 0 },
        color: { r: 0.2, g: 0.6, b: 0.3 },
        label: "Nursery Base",
      },
      // Coral tree support (vertical post)
      {
        id: "M01_support",
        type: "static",
        shape: "cylinder",
        size: { x: 0.008, y: 0.10, z: 0.008 },
        position: { x: 0, y: 0.065, z: 0 },
        color: { r: 0.3, g: 0.7, b: 0.4 },
        label: "Tree Support",
      },
      // Coral tree (dynamic - can be hung on support)
      {
        id: "M01_tree",
        type: "dynamic",
        shape: "cylinder",
        size: { x: 0.015, y: 0.06, z: 0.015 },
        position: { x: 0.06, y: 0.04, z: 0 },
        color: { r: 0.9, g: 0.3, b: 0.5 },
        mass: 0.05,
        label: "Coral Tree",
      },
      // Coral buds (hinge - flip up)
      {
        id: "M01_buds",
        type: "hinge",
        shape: "box",
        size: { x: 0.06, y: 0.01, z: 0.04 },
        position: { x: -0.04, y: 0.015, z: 0.04 },
        color: { r: 1.0, g: 0.5, b: 0.7 },
        hingeAxis: "x",
        hingeLimits: { min: 0, max: Math.PI / 2 },
        label: "Coral Buds",
      },
    ],
  },

  // === M02: Shark (upper-left) ===
  {
    id: "M02",
    name: "Shark",
    shortName: "Shark",
    description: "Release the shark from its cave into the habitat.",
    position: { x: -0.35, z: -0.30 },
    maxPoints: 30,
    parts: [
      // Cave structure
      {
        id: "M02_cave",
        type: "static",
        shape: "box",
        size: { x: 0.10, y: 0.06, z: 0.08 },
        position: { x: 0, y: 0.03, z: 0 },
        color: { r: 0.35, g: 0.35, b: 0.4 },
        label: "Shark Cave",
      },
      // Shark (dynamic - pushable)
      {
        id: "M02_shark",
        type: "dynamic",
        shape: "box",
        size: { x: 0.04, y: 0.025, z: 0.08 },
        position: { x: 0, y: 0.02, z: 0.06 },
        color: { r: 0.5, g: 0.5, b: 0.55 },
        mass: 0.08,
        friction: 0.4,
        label: "Shark",
      },
      // Habitat zone (trigger)
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

  // === M03: Coral Reef (upper-center) ===
  {
    id: "M03",
    name: "Coral Reef",
    shortName: "Reef",
    description: "Flip the coral reef structure up without damaging nearby segments.",
    position: { x: 0.10, z: -0.30 },
    maxPoints: 35,
    parts: [
      // Reef base
      {
        id: "M03_base",
        type: "static",
        shape: "box",
        size: { x: 0.14, y: 0.01, z: 0.10 },
        position: { x: 0, y: 0.005, z: 0 },
        color: { r: 0.2, g: 0.5, b: 0.3 },
        label: "Reef Base",
      },
      // Main reef (hinge - flips up)
      {
        id: "M03_reef",
        type: "hinge",
        shape: "box",
        size: { x: 0.08, y: 0.06, z: 0.01 },
        position: { x: 0, y: 0.04, z: 0 },
        color: { r: 0.1, g: 0.7, b: 0.4 },
        hingeAxis: "z",
        hingeLimits: { min: 0, max: Math.PI / 2 },
        label: "Coral Reef",
      },
      // Reef segments (dynamic - can be knocked over)
      {
        id: "M03_seg1",
        type: "dynamic",
        shape: "cylinder",
        size: { x: 0.012, y: 0.04, z: 0.012 },
        position: { x: -0.05, y: 0.02, z: 0.04 },
        color: { r: 0.3, g: 0.8, b: 0.5 },
        mass: 0.03,
        label: "Reef Segment 1",
      },
      {
        id: "M03_seg2",
        type: "dynamic",
        shape: "cylinder",
        size: { x: 0.012, y: 0.04, z: 0.012 },
        position: { x: 0.05, y: 0.02, z: 0.04 },
        color: { r: 0.4, g: 0.9, b: 0.6 },
        mass: 0.03,
        label: "Reef Segment 2",
      },
    ],
  },

  // === M05: Angler Fish (mid-left) ===
  {
    id: "M05",
    name: "Angler Fish",
    shortName: "Angler",
    description: "Guide the angler fish into the shipwreck.",
    position: { x: -0.35, z: 0.0 },
    maxPoints: 30,
    parts: [
      // Shipwreck hull
      {
        id: "M05_wreck",
        type: "static",
        shape: "box",
        size: { x: 0.14, y: 0.08, z: 0.10 },
        position: { x: 0, y: 0.04, z: 0 },
        color: { r: 0.4, g: 0.3, b: 0.2 },
        label: "Shipwreck",
      },
      // Angler fish (dynamic)
      {
        id: "M05_fish",
        type: "dynamic",
        shape: "sphere",
        size: { x: 0.02, y: 0.02, z: 0.02 },
        position: { x: -0.10, y: 0.02, z: 0 },
        color: { r: 0.9, g: 0.7, b: 0.2 },
        mass: 0.04,
        label: "Angler Fish",
      },
    ],
  },

  // === M06: Raise the Mast (mid-center) ===
  {
    id: "M06",
    name: "Raise the Mast",
    shortName: "Mast",
    description: "Raise the shipwreck's mast to explore inside.",
    position: { x: 0.0, z: 0.0 },
    maxPoints: 30,
    parts: [
      // Shipwreck deck
      {
        id: "M06_deck",
        type: "static",
        shape: "box",
        size: { x: 0.16, y: 0.02, z: 0.10 },
        position: { x: 0, y: 0.01, z: 0 },
        color: { r: 0.45, g: 0.35, b: 0.25 },
        label: "Ship Deck",
      },
      // Mast (hinge - raises up)
      {
        id: "M06_mast",
        type: "hinge",
        shape: "box",
        size: { x: 0.015, y: 0.12, z: 0.015 },
        position: { x: 0, y: 0.08, z: 0 },
        color: { r: 0.6, g: 0.5, b: 0.3 },
        hingeAxis: "x",
        hingeLimits: { min: -Math.PI / 2, max: 0 },
        label: "Mast",
      },
    ],
  },

  // === M08: Artificial Habitat (mid-right) ===
  {
    id: "M08",
    name: "Artificial Habitat",
    shortName: "Habitat",
    description: "Rearrange habitat segments to create safe homes for sea creatures.",
    position: { x: 0.55, z: -0.10 },
    maxPoints: 40,
    parts: [
      // Base
      {
        id: "M08_base",
        type: "static",
        shape: "box",
        size: { x: 0.10, y: 0.01, z: 0.10 },
        position: { x: 0, y: 0.005, z: 0 },
        color: { r: 0.8, g: 0.7, b: 0.2 },
        label: "Habitat Base",
      },
      // Stacked segments (dynamic - can be knocked/rearranged)
      {
        id: "M08_seg1",
        type: "dynamic",
        shape: "box",
        size: { x: 0.06, y: 0.025, z: 0.06 },
        position: { x: 0, y: 0.025, z: 0 },
        color: { r: 0.9, g: 0.8, b: 0.3 },
        mass: 0.05,
        label: "Habitat Seg 1",
      },
      {
        id: "M08_seg2",
        type: "dynamic",
        shape: "box",
        size: { x: 0.06, y: 0.025, z: 0.06 },
        position: { x: 0, y: 0.05, z: 0 },
        color: { r: 0.85, g: 0.75, b: 0.25 },
        mass: 0.05,
        label: "Habitat Seg 2",
      },
      {
        id: "M08_seg3",
        type: "dynamic",
        shape: "box",
        size: { x: 0.06, y: 0.025, z: 0.06 },
        position: { x: 0, y: 0.075, z: 0 },
        color: { r: 0.8, g: 0.7, b: 0.2 },
        mass: 0.05,
        label: "Habitat Seg 3",
      },
      {
        id: "M08_seg4",
        type: "dynamic",
        shape: "box",
        size: { x: 0.06, y: 0.025, z: 0.06 },
        position: { x: 0, y: 0.1, z: 0 },
        color: { r: 0.85, g: 0.75, b: 0.25 },
        mass: 0.05,
        label: "Habitat Seg 4",
      },
    ],
  },

  // === M11: Sonar Discovery (lower-center) ===
  {
    id: "M11",
    name: "Sonar Discovery",
    shortName: "Sonar",
    description: "Use sonar to reveal hidden whales.",
    position: { x: 0.10, z: 0.20 },
    maxPoints: 30,
    parts: [
      // Sonar base
      {
        id: "M11_base",
        type: "static",
        shape: "box",
        size: { x: 0.12, y: 0.01, z: 0.08 },
        position: { x: 0, y: 0.005, z: 0 },
        color: { r: 0.2, g: 0.3, b: 0.5 },
        label: "Sonar Base",
      },
      // Whale panel 1 (hinge - flips to reveal)
      {
        id: "M11_whale1",
        type: "hinge",
        shape: "box",
        size: { x: 0.04, y: 0.04, z: 0.01 },
        position: { x: -0.03, y: 0.03, z: 0 },
        color: { r: 0.3, g: 0.4, b: 0.7 },
        hingeAxis: "y",
        hingeLimits: { min: 0, max: Math.PI / 2 },
        label: "Whale 1",
      },
      // Whale panel 2 (hinge - flips to reveal)
      {
        id: "M11_whale2",
        type: "hinge",
        shape: "box",
        size: { x: 0.04, y: 0.04, z: 0.01 },
        position: { x: 0.03, y: 0.03, z: 0 },
        color: { r: 0.3, g: 0.4, b: 0.7 },
        hingeAxis: "y",
        hingeLimits: { min: -Math.PI / 2, max: 0 },
        label: "Whale 2",
      },
    ],
  },

  // === M13: Change Shipping Lanes (lower-right) ===
  {
    id: "M13",
    name: "Change Shipping Lanes",
    shortName: "Ship",
    description: "Move the cargo ship to a new shipping lane.",
    position: { x: 0.55, z: 0.25 },
    maxPoints: 20,
    parts: [
      // Lane markers
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
      // Cargo ship (dynamic - slides)
      {
        id: "M13_ship",
        type: "dynamic",
        shape: "box",
        size: { x: 0.10, y: 0.03, z: 0.04 },
        position: { x: 0, y: 0.025, z: -0.04 },
        color: { r: 0.7, g: 0.2, b: 0.2 },
        mass: 0.1,
        friction: 0.5,
        label: "Cargo Ship",
      },
      // Target zone (trigger)
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
];

/** Get all missions for the current season */
export function getSeasonMissions(): MissionDefinition[] {
  return SUBMERGED_MISSIONS;
}
