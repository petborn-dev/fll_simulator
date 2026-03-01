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
 * SUBMERGED Mission Definitions — All 15 Missions
 * Positions are approximate based on the official field layout.
 * Front of field (launch areas) = -Z = bottom of screen
 */
export const SUBMERGED_MISSIONS: MissionDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // M01: Coral Nursery (far-left, upper area)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M01",
    name: "Coral Nursery",
    shortName: "Coral",
    description: "Hang the coral tree on its support and flip the coral buds up.",
    position: { x: -0.95, z: 0.25 },
    maxPoints: 50,
    parts: [
      {
        id: "M01_base",
        type: "static",
        shape: "box",
        size: { x: 0.12, y: 0.015, z: 0.10 },
        position: { x: 0, y: 0.0075, z: 0 },
        color: { r: 0.2, g: 0.6, b: 0.3 },
        label: "Nursery Base",
      },
      {
        id: "M01_support",
        type: "static",
        shape: "cylinder",
        size: { x: 0.008, y: 0.10, z: 0.008 },
        position: { x: 0, y: 0.065, z: 0 },
        color: { r: 0.3, g: 0.7, b: 0.4 },
        label: "Tree Support",
      },
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

  // ═══════════════════════════════════════════════════════════════
  // M02: Shark (upper-center-left)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M02",
    name: "Shark",
    shortName: "Shark",
    description: "Release the shark from its cave into the habitat.",
    position: { x: -0.35, z: 0.4 },
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
  // M03: Coral Reef (upper-right area)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M03",
    name: "Coral Reef",
    shortName: "Reef",
    description: "Flip the coral reef structure up without damaging nearby segments.",
    position: { x: 0.55, z: 0.4 },
    maxPoints: 40,
    parts: [
      {
        id: "M03_base",
        type: "static",
        shape: "box",
        size: { x: 0.14, y: 0.01, z: 0.10 },
        position: { x: 0, y: 0.005, z: 0 },
        color: { r: 0.2, g: 0.5, b: 0.3 },
        label: "Reef Base",
      },
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
      {
        id: "M03_seg3",
        type: "dynamic",
        shape: "cylinder",
        size: { x: 0.012, y: 0.05, z: 0.012 },
        position: { x: 0, y: 0.025, z: -0.04 },
        color: { r: 0.35, g: 0.85, b: 0.55 },
        mass: 0.015,
        friction: 0.5,
        restitution: 0.05,
        label: "Reef Segment 3",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M04: Scuba Diver (left side, near M01)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M04",
    name: "Scuba Diver",
    shortName: "Diver",
    description: "Transport the scuba diver from the coral nursery to the coral reef support.",
    position: { x: -0.75, z: 0.1 },
    maxPoints: 40,
    parts: [
      // Diver figure (dynamic — small person-shaped, pushable)
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
      // Starting platform (near coral nursery)
      {
        id: "M04_start",
        type: "static",
        shape: "box",
        size: { x: 0.06, y: 0.008, z: 0.06 },
        position: { x: 0, y: 0.004, z: 0 },
        color: { r: 0.3, g: 0.3, b: 0.6 },
        label: "Diver Start",
      },
      // Target zone (near coral reef — M03 area)
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
  // M05: Angler Fish (center-left, mid area — shipwreck zone)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M05",
    name: "Angler Fish",
    shortName: "Angler",
    description: "Push the angler fish into the shipwreck through the gate.",
    position: { x: -0.3, z: 0.05 },
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

  // ═══════════════════════════════════════════════════════════════
  // M06: Raise the Mast (center of field — shipwreck)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M06",
    name: "Raise the Mast",
    shortName: "Mast",
    description: "Push the lever to raise the shipwreck's mast upright.",
    position: { x: -0.1, z: 0.05 },
    maxPoints: 30,
    parts: [
      {
        id: "M06_deck",
        type: "static",
        shape: "box",
        size: { x: 0.16, y: 0.02, z: 0.10 },
        position: { x: 0, y: 0.01, z: 0 },
        color: { r: 0.45, g: 0.35, b: 0.25 },
        label: "Ship Deck",
      },
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

  // ═══════════════════════════════════════════════════════════════
  // M07: Kraken's Treasure (center-left, below shipwreck)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M07",
    name: "Kraken's Treasure",
    shortName: "Kraken",
    description: "Retrieve the treasure chest from the kraken's nest.",
    position: { x: -0.4, z: -0.1 },
    maxPoints: 20,
    parts: [
      // Kraken's nest (static enclosure)
      {
        id: "M07_nest",
        type: "static",
        shape: "box",
        size: { x: 0.10, y: 0.05, z: 0.10 },
        position: { x: 0, y: 0.025, z: 0 },
        color: { r: 0.35, g: 0.25, b: 0.15 },
        label: "Kraken's Nest",
      },
      // Tentacle barrier (hinge — push to open)
      {
        id: "M07_tentacle",
        type: "hinge",
        shape: "box",
        size: { x: 0.01, y: 0.05, z: 0.08 },
        position: { x: -0.055, y: 0.035, z: 0 },
        color: { r: 0.6, g: 0.2, b: 0.5 },
        mass: 0.025,
        hingeAxis: "y",
        hingeLimits: { min: 0, max: Math.PI / 2 },
        hingeAnchorOffset: { x: 0, y: 0, z: -0.04 },
        hingeDamping: 0.8,
        label: "Tentacle Gate",
      },
      // Treasure chest (dynamic — push out of nest)
      {
        id: "M07_chest",
        type: "dynamic",
        shape: "box",
        size: { x: 0.035, y: 0.025, z: 0.03 },
        position: { x: 0, y: 0.02, z: 0 },
        color: { r: 0.85, g: 0.65, b: 0.1 },
        mass: 0.04,
        friction: 0.4,
        restitution: 0.05,
        label: "Treasure Chest",
      },
      // Outside zone (trigger — chest must be pushed here)
      {
        id: "M07_outside",
        type: "trigger",
        shape: "box",
        size: { x: 0.15, y: 0.005, z: 0.15 },
        position: { x: -0.15, y: 0.0025, z: 0 },
        color: { r: 0.7, g: 0.5, b: 0.1 },
        label: "Outside Zone",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M08: Artificial Habitat (right side, upper-middle)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M08",
    name: "Artificial Habitat",
    shortName: "Habitat",
    description: "Rearrange habitat segments to create safe homes for sea creatures.",
    position: { x: 0.75, z: 0.2 },
    maxPoints: 40,
    parts: [
      {
        id: "M08_base",
        type: "static",
        shape: "box",
        size: { x: 0.10, y: 0.01, z: 0.10 },
        position: { x: 0, y: 0.005, z: 0 },
        color: { r: 0.8, g: 0.7, b: 0.2 },
        label: "Habitat Base",
      },
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
  // M09: Unexpected Encounter (right side, middle)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M09",
    name: "Unexpected Encounter",
    shortName: "Creature",
    description: "Release the unknown creature from the AUV and deliver it to the cold seep.",
    position: { x: 0.8, z: 0.05 },
    maxPoints: 30,
    parts: [
      // AUV (Autonomous Underwater Vehicle) — static base
      {
        id: "M09_auv",
        type: "static",
        shape: "box",
        size: { x: 0.10, y: 0.04, z: 0.06 },
        position: { x: 0, y: 0.02, z: 0 },
        color: { r: 0.6, g: 0.6, b: 0.65 },
        label: "AUV",
      },
      // Unknown creature (dynamic — attached, needs to be released)
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
      // Cold seep target zone
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
  // M10: Send Over the Submersible (left side, lower-middle)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M10",
    name: "Send Over the Submersible",
    shortName: "Submersible",
    description: "Lower the yellow flag and send the submersible toward the opposing field.",
    position: { x: -0.55, z: -0.15 },
    maxPoints: 40,
    parts: [
      // Flag post (static)
      {
        id: "M10_post",
        type: "static",
        shape: "cylinder",
        size: { x: 0.006, y: 0.08, z: 0.006 },
        position: { x: 0, y: 0.04, z: 0 },
        color: { r: 0.4, g: 0.4, b: 0.45 },
        label: "Flag Post",
      },
      // Yellow flag (hinge — push down)
      {
        id: "M10_flag",
        type: "hinge",
        shape: "box",
        size: { x: 0.04, y: 0.025, z: 0.005 },
        position: { x: 0.025, y: 0.07, z: 0 },
        color: { r: 0.95, g: 0.85, b: 0.1 },
        mass: 0.01,
        hingeAxis: "z",
        hingeLimits: { min: -Math.PI / 2, max: 0 },
        hingeAnchorOffset: { x: -0.02, y: 0, z: 0 },
        hingeDamping: 0.5,
        label: "Yellow Flag",
      },
      // Submersible (dynamic — push toward opposing field)
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
      // Opposing field direction trigger
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
  // M11: Sonar Discovery (center, lower-middle)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M11",
    name: "Sonar Discovery",
    shortName: "Sonar",
    description: "Push the panels to reveal hidden whales.",
    position: { x: 0.1, z: -0.15 },
    maxPoints: 30,
    parts: [
      {
        id: "M11_base",
        type: "static",
        shape: "box",
        size: { x: 0.12, y: 0.01, z: 0.08 },
        position: { x: 0, y: 0.005, z: 0 },
        color: { r: 0.2, g: 0.3, b: 0.5 },
        label: "Sonar Base",
      },
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

  // ═══════════════════════════════════════════════════════════════
  // M12: Feed the Whale (right side, lower-middle)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M12",
    name: "Feed the Whale",
    shortName: "Whale",
    description: "Collect krill and push them into the whale's mouth.",
    position: { x: 0.7, z: -0.1 },
    maxPoints: 50,
    parts: [
      // Whale body (static)
      {
        id: "M12_whale",
        type: "static",
        shape: "box",
        size: { x: 0.12, y: 0.06, z: 0.08 },
        position: { x: 0, y: 0.03, z: 0 },
        color: { r: 0.25, g: 0.3, b: 0.5 },
        label: "Whale",
      },
      // Whale mouth (trigger zone)
      {
        id: "M12_mouth",
        type: "trigger",
        shape: "box",
        size: { x: 0.06, y: 0.04, z: 0.06 },
        position: { x: -0.08, y: 0.03, z: 0 },
        color: { r: 0.4, g: 0.2, b: 0.3 },
        label: "Whale Mouth",
      },
      // Krill pieces (5 dynamic pieces scattered nearby)
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
        id: "M12_krill4",
        type: "dynamic",
        shape: "sphere",
        size: { x: 0.01, y: 0.01, z: 0.01 },
        position: { x: -0.22, y: 0.012, z: 0.03 },
        color: { r: 0.95, g: 0.4, b: 0.2 },
        mass: 0.01,
        friction: 0.5,
        restitution: 0.1,
        label: "Krill 4",
      },
      {
        id: "M12_krill5",
        type: "dynamic",
        shape: "sphere",
        size: { x: 0.01, y: 0.01, z: 0.01 },
        position: { x: -0.17, y: 0.012, z: -0.04 },
        color: { r: 0.95, g: 0.4, b: 0.2 },
        mass: 0.01,
        friction: 0.5,
        restitution: 0.1,
        label: "Krill 5",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // M13: Change Shipping Lanes (center-right, lower area)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M13",
    name: "Change Shipping Lanes",
    shortName: "Ship",
    description: "Push the cargo ship from lane 1 to lane 2.",
    position: { x: 0.55, z: -0.3 },
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
  // M14: Sample Collection (center, lower area)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M14",
    name: "Sample Collection",
    shortName: "Samples",
    description: "Collect water, seabed, and plankton samples plus trident pieces from around the field.",
    position: { x: -0.1, z: -0.3 },
    maxPoints: 55,
    parts: [
      // Water sample (dynamic — small blue cylinder)
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
      // Water sample area (trigger — sample starts here)
      {
        id: "M14_water_area",
        type: "trigger",
        shape: "box",
        size: { x: 0.06, y: 0.005, z: 0.06 },
        position: { x: -0.06, y: 0.0025, z: 0 },
        color: { r: 0.2, g: 0.4, b: 0.8 },
        label: "Water Sample Area",
      },
      // Seabed sample (dynamic — brown cylinder)
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
      // Seabed area (trigger)
      {
        id: "M14_seabed_area",
        type: "trigger",
        shape: "box",
        size: { x: 0.06, y: 0.005, z: 0.06 },
        position: { x: 0, y: 0.0025, z: 0 },
        color: { r: 0.5, g: 0.35, b: 0.15 },
        label: "Seabed Area",
      },
      // Plankton sample (dynamic — green cylinder)
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
      // Kelp forest area (trigger)
      {
        id: "M14_kelp_area",
        type: "trigger",
        shape: "box",
        size: { x: 0.06, y: 0.005, z: 0.06 },
        position: { x: 0.06, y: 0.0025, z: 0 },
        color: { r: 0.15, g: 0.6, b: 0.2 },
        label: "Kelp Forest Area",
      },
      // Trident piece 1 (dynamic — near shipwreck area)
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
      // Trident piece 2
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
  // M15: Research Vessel (far-right, lower area)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "M15",
    name: "Research Vessel",
    shortName: "Vessel",
    description: "Dock the research vessel and load collected samples, trident parts, and treasure chest.",
    position: { x: 0.85, z: -0.3 },
    maxPoints: 40,
    parts: [
      // Research vessel hull (static)
      {
        id: "M15_hull",
        type: "static",
        shape: "box",
        size: { x: 0.14, y: 0.04, z: 0.08 },
        position: { x: 0, y: 0.02, z: 0 },
        color: { r: 0.7, g: 0.7, b: 0.75 },
        label: "Research Vessel",
      },
      // Cargo area (trigger — items must be placed here)
      {
        id: "M15_cargo",
        type: "trigger",
        shape: "box",
        size: { x: 0.10, y: 0.04, z: 0.06 },
        position: { x: 0, y: 0.04, z: 0 },
        color: { r: 0.3, g: 0.6, b: 0.3 },
        label: "Cargo Area",
      },
      // Port latch (hinge — push to dock)
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
