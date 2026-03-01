/**
 * FLL SUBMERGED 2024-2025 — Mission Definitions (Phase 3.5 Enhanced)
 * 
 * Each mission is defined as a data structure containing:
 * - Position on the field (in meters, field center = 0,0)
 * - Geometry description for simplified 3D representation
 * - Physics properties (static, dynamic, hinged, trigger)
 * - Scoring conditions
 * 
 * Phase 3.5 enhancements:
 * - Improved hinge joint parameters with anchor offsets for realistic pivot points
 * - Better mass/damping values for realistic push and topple physics
 * - Added hingeAnchorOffset for precise pivot placement
 * - More detailed multi-part mission models with trigger zones
 * 
 * Field coordinate system (matches screen orientation):
 *   X: left(-) to right(+), range: -1.181 to +1.181
 *   Z: back(+) to front(-), range: +0.5715 (top of screen) to -0.5715 (bottom)
 *   Y: up, ground = 0
 *   Front of field (launch areas) = -Z = bottom of screen
 *   Back of field (far missions) = +Z = top of screen
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
  mass?: number; // only for dynamic/hinge parts
  friction?: number;
  restitution?: number;
  hingeAxis?: "x" | "y" | "z"; // for hinge type
  hingeLimits?: { min: number; max: number }; // radians
  hingeAnchorOffset?: { x: number; y: number; z: number }; // offset from part center to hinge pivot
  hingeDamping?: number; // angular damping for the hinge body
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
  // === M01: Coral Nursery (back-left area, +Z) ===
  {
    id: "M01",
    name: "Coral Nursery",
    shortName: "Coral",
    description: "Hang the coral tree on its support and flip the coral buds up.",
    position: { x: -0.75, z: 0.25 },
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
      // Coral tree (dynamic - can be hung on support by pushing into place)
      {
        id: "M01_tree",
        type: "dynamic",
        shape: "cylinder",
        size: { x: 0.015, y: 0.06, z: 0.015 },
        position: { x: 0.06, y: 0.04, z: 0 },
        color: { r: 0.9, g: 0.3, b: 0.5 },
        mass: 0.04,
        friction: 0.6,
        restitution: 0.05,
        label: "Coral Tree",
      },
      // Coral buds (hinge - flip up when pushed from below)
      {
        id: "M01_buds",
        type: "hinge",
        shape: "box",
        size: { x: 0.06, y: 0.01, z: 0.04 },
        position: { x: -0.04, y: 0.015, z: 0.04 },
        color: { r: 1.0, g: 0.5, b: 0.7 },
        mass: 0.02,
        hingeAxis: "x",
        hingeLimits: { min: 0, max: Math.PI / 2 },
        hingeAnchorOffset: { x: 0, y: -0.005, z: -0.02 },
        hingeDamping: 0.8,
        label: "Coral Buds",
      },
    ],
  },

  // === M02: Shark (back-left, +Z) ===
  {
    id: "M02",
    name: "Shark",
    shortName: "Shark",
    description: "Release the shark from its cave into the habitat.",
    position: { x: -0.35, z: 0.30 },
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
      // Shark (dynamic - pushable, slides along ground)
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

  // === M03: Coral Reef (back-center, +Z) ===
  {
    id: "M03",
    name: "Coral Reef",
    shortName: "Reef",
    description: "Flip the coral reef structure up without damaging nearby segments.",
    position: { x: 0.10, z: 0.30 },
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
      // Main reef panel (hinge - flips up when pushed)
      {
        id: "M03_reef",
        type: "hinge",
        shape: "box",
        size: { x: 0.08, y: 0.06, z: 0.01 },
        position: { x: 0, y: 0.04, z: 0 },
        color: { r: 0.1, g: 0.7, b: 0.4 },
        mass: 0.025,
        hingeAxis: "z",
        hingeLimits: { min: 0, max: Math.PI / 2 },
        hingeAnchorOffset: { x: 0, y: -0.03, z: 0 },
        hingeDamping: 0.6,
        label: "Coral Reef",
      },
      // Reef segments (dynamic - tall and narrow, can topple when bumped)
      {
        id: "M03_seg1",
        type: "dynamic",
        shape: "cylinder",
        size: { x: 0.012, y: 0.05, z: 0.012 },
        position: { x: -0.05, y: 0.025, z: 0.04 },
        color: { r: 0.3, g: 0.8, b: 0.5 },
        mass: 0.015,
        friction: 0.5,
        restitution: 0.05,
        label: "Reef Segment 1",
      },
      {
        id: "M03_seg2",
        type: "dynamic",
        shape: "cylinder",
        size: { x: 0.012, y: 0.05, z: 0.012 },
        position: { x: 0.05, y: 0.025, z: 0.04 },
        color: { r: 0.4, g: 0.9, b: 0.6 },
        mass: 0.015,
        friction: 0.5,
        restitution: 0.05,
        label: "Reef Segment 2",
      },
    ],
  },

  // === M05: Angler Fish (mid-left, z=0) ===
  {
    id: "M05",
    name: "Angler Fish",
    shortName: "Angler",
    description: "Push the angler fish into the shipwreck through the gate.",
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
      // Gate (hinge - opens when pushed to allow fish entry)
      {
        id: "M05_gate",
        type: "hinge",
        shape: "box",
        size: { x: 0.01, y: 0.06, z: 0.08 },
        position: { x: -0.075, y: 0.04, z: 0 },
        color: { r: 0.5, g: 0.4, b: 0.25 },
        mass: 0.02,
        hingeAxis: "y",
        hingeLimits: { min: 0, max: Math.PI / 2 },
        hingeAnchorOffset: { x: 0, y: 0, z: -0.04 },
        hingeDamping: 1.0,
        label: "Wreck Gate",
      },
      // Angler fish (dynamic - pushable sphere)
      {
        id: "M05_fish",
        type: "dynamic",
        shape: "sphere",
        size: { x: 0.02, y: 0.02, z: 0.02 },
        position: { x: -0.12, y: 0.02, z: 0 },
        color: { r: 0.9, g: 0.7, b: 0.2 },
        mass: 0.03,
        friction: 0.4,
        restitution: 0.1,
        label: "Angler Fish",
      },
      // Target zone inside wreck (trigger)
      {
        id: "M05_target",
        type: "trigger",
        shape: "box",
        size: { x: 0.08, y: 0.005, z: 0.06 },
        position: { x: 0.02, y: 0.0025, z: 0 },
        color: { r: 0.8, g: 0.6, b: 0.1 },
        label: "Fish Target",
      },
    ],
  },

  // === M06: Raise the Mast (center, z=0) ===
  {
    id: "M06",
    name: "Raise the Mast",
    shortName: "Mast",
    description: "Push the lever to raise the shipwreck's mast upright.",
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
      // Lever arm (hinge - push to activate)
      {
        id: "M06_lever",
        type: "hinge",
        shape: "box",
        size: { x: 0.015, y: 0.10, z: 0.015 },
        position: { x: -0.06, y: 0.07, z: 0 },
        color: { r: 0.7, g: 0.55, b: 0.35 },
        mass: 0.02,
        hingeAxis: "z",
        hingeLimits: { min: -Math.PI / 3, max: Math.PI / 3 },
        hingeAnchorOffset: { x: 0, y: -0.05, z: 0 },
        hingeDamping: 0.5,
        label: "Lever",
      },
      // Mast (hinge - raises from lying down to upright)
      {
        id: "M06_mast",
        type: "hinge",
        shape: "box",
        size: { x: 0.015, y: 0.12, z: 0.015 },
        position: { x: 0.03, y: 0.08, z: 0 },
        color: { r: 0.6, g: 0.5, b: 0.3 },
        mass: 0.03,
        hingeAxis: "x",
        hingeLimits: { min: -Math.PI / 2, max: 0 },
        hingeAnchorOffset: { x: 0, y: -0.06, z: 0 },
        hingeDamping: 1.2,
        label: "Mast",
      },
      // Crow's nest on mast tip
      {
        id: "M06_nest",
        type: "dynamic",
        shape: "cylinder",
        size: { x: 0.012, y: 0.015, z: 0.012 },
        position: { x: 0.03, y: 0.15, z: 0 },
        color: { r: 0.5, g: 0.4, b: 0.25 },
        mass: 0.01,
        friction: 0.5,
        label: "Crow's Nest",
      },
    ],
  },

  // === M08: Artificial Habitat (mid-right, +Z) ===
  {
    id: "M08",
    name: "Artificial Habitat",
    shortName: "Habitat",
    description: "Rearrange habitat segments to create safe homes for sea creatures.",
    position: { x: 0.55, z: 0.10 },
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
      // Stacked segments (dynamic - topple tower physics)
      {
        id: "M08_seg1",
        type: "dynamic",
        shape: "box",
        size: { x: 0.06, y: 0.02, z: 0.06 },
        position: { x: 0, y: 0.02, z: 0 },
        color: { r: 0.9, g: 0.8, b: 0.3 },
        mass: 0.04,
        friction: 0.6,
        restitution: 0.02,
        label: "Habitat Seg 1",
      },
      {
        id: "M08_seg2",
        type: "dynamic",
        shape: "box",
        size: { x: 0.06, y: 0.02, z: 0.06 },
        position: { x: 0, y: 0.04, z: 0 },
        color: { r: 0.85, g: 0.75, b: 0.25 },
        mass: 0.04,
        friction: 0.6,
        restitution: 0.02,
        label: "Habitat Seg 2",
      },
      {
        id: "M08_seg3",
        type: "dynamic",
        shape: "box",
        size: { x: 0.06, y: 0.02, z: 0.06 },
        position: { x: 0, y: 0.06, z: 0 },
        color: { r: 0.8, g: 0.7, b: 0.2 },
        mass: 0.04,
        friction: 0.6,
        restitution: 0.02,
        label: "Habitat Seg 3",
      },
      {
        id: "M08_seg4",
        type: "dynamic",
        shape: "box",
        size: { x: 0.06, y: 0.02, z: 0.06 },
        position: { x: 0, y: 0.08, z: 0 },
        color: { r: 0.85, g: 0.75, b: 0.25 },
        mass: 0.035,
        friction: 0.6,
        restitution: 0.02,
        label: "Habitat Seg 4",
      },
      // Target zone for rearranged segments
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

  // === M11: Sonar Discovery (front-center, -Z) ===
  {
    id: "M11",
    name: "Sonar Discovery",
    shortName: "Sonar",
    description: "Push the panels to reveal hidden whales.",
    position: { x: 0.10, z: -0.20 },
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
      // Whale panel 1 (hinge - door that opens to reveal whale)
      {
        id: "M11_whale1",
        type: "hinge",
        shape: "box",
        size: { x: 0.04, y: 0.04, z: 0.008 },
        position: { x: -0.03, y: 0.03, z: 0 },
        color: { r: 0.3, g: 0.4, b: 0.7 },
        mass: 0.015,
        hingeAxis: "y",
        hingeLimits: { min: 0, max: Math.PI / 2 },
        hingeAnchorOffset: { x: -0.02, y: 0, z: 0 },
        hingeDamping: 0.5,
        label: "Whale Panel 1",
      },
      // Whale panel 2 (hinge - door that opens opposite direction)
      {
        id: "M11_whale2",
        type: "hinge",
        shape: "box",
        size: { x: 0.04, y: 0.04, z: 0.008 },
        position: { x: 0.03, y: 0.03, z: 0 },
        color: { r: 0.3, g: 0.4, b: 0.7 },
        mass: 0.015,
        hingeAxis: "y",
        hingeLimits: { min: -Math.PI / 2, max: 0 },
        hingeAnchorOffset: { x: 0.02, y: 0, z: 0 },
        hingeDamping: 0.5,
        label: "Whale Panel 2",
      },
      // Hidden whale behind panels
      {
        id: "M11_whale_hidden",
        type: "static",
        shape: "sphere",
        size: { x: 0.015, y: 0.015, z: 0.015 },
        position: { x: 0, y: 0.025, z: -0.015 },
        color: { r: 0.2, g: 0.3, b: 0.6 },
        label: "Hidden Whale",
      },
    ],
  },

  // === M13: Change Shipping Lanes (front-right, -Z) ===
  {
    id: "M13",
    name: "Change Shipping Lanes",
    shortName: "Ship",
    description: "Push the cargo ship from lane 1 to lane 2.",
    position: { x: 0.55, z: -0.25 },
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
      // Cargo ship (dynamic - slides when pushed)
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
