/**
 * Mission Renderer — Phase 3.5 Enhanced
 * 
 * Builds 3D meshes and physics bodies from mission definitions.
 * Creates Babylon.js meshes and Rapier rigid bodies for each mission part,
 * handling static, dynamic, hinge, and trigger types.
 * 
 * Phase 3.5 enhancements:
 * - Hinge anchor offsets for realistic pivot points (e.g., door hinges at edge)
 * - Per-part angular damping for hinge bodies
 * - Improved dynamic body parameters for better topple/flip physics
 * - Lower linear damping on dynamic parts for more realistic sliding
 */
import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  ShadowGenerator,
  Mesh,
  Quaternion,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock, Rectangle } from "@babylonjs/gui";
import RAPIER from "@dimforge/rapier3d-compat";
import type { MissionDefinition, MissionPart, CompoundChild } from "./missions";

// Shared fullscreen GUI texture for all mission labels (created once)
let _guiTexture: AdvancedDynamicTexture | null = null;
function getGuiTexture(scene: Scene): AdvancedDynamicTexture {
  if (!_guiTexture) {
    _guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("missionLabelsUI", true, scene);
    _guiTexture.idealWidth = 1920;
  }
  return _guiTexture;
}

/** Dispose the shared GUI texture (call on scene reset) */
export function disposeMissionLabelsGUI(): void {
  if (_guiTexture) {
    _guiTexture.dispose();
    _guiTexture = null;
  }
}

export interface RenderedMissionPart {
  id: string;
  mesh: Mesh | TransformNode;
  rigidBody: RAPIER.RigidBody | null;
  joint: RAPIER.ImpulseJoint | null;
  definition: MissionPart;
  /** Saved at creation time for reset */
  initialPosition: { x: number; y: number; z: number };
  initialRotation: { x: number; y: number; z: number; w: number };
}

export interface RenderedMission {
  id: string;
  name: string;
  parts: RenderedMissionPart[];
  labelMesh: Mesh | null;
  /** GUI rectangle control for the floating label (for dynamic color updates) */
  labelRect: Rectangle | null;
  /** GUI text control for the floating label (for dynamic color updates) */
  labelText: TextBlock | null;
  origin: { x: number; z: number };
}

/**
 * Render all missions from a list of definitions
 */
export function renderMissions(
  missions: MissionDefinition[],
  scene: Scene,
  world: RAPIER.World,
  shadowGenerator: ShadowGenerator | null
): RenderedMission[] {
  return missions.map((mission) => renderMission(mission, scene, world, shadowGenerator));
}

/**
 * Render a single mission from its definition
 */
function renderMission(
  mission: MissionDefinition,
  scene: Scene,
  world: RAPIER.World,
  shadowGenerator: ShadowGenerator | null
): RenderedMission {
  const parentNode = new TransformNode(`mission_${mission.id}`, scene);
  const renderedParts: RenderedMissionPart[] = [];

  // Create a floating label above the mission
  const labelResult = createMissionLabel(mission, scene);

  for (const part of mission.parts) {
    const rendered = renderPart(part, mission.position, scene, world, shadowGenerator);
    renderedParts.push(rendered);
  }

  return {
    id: mission.id,
    name: mission.name,
    parts: renderedParts,
    labelMesh: labelResult.anchor,
    labelRect: labelResult.rect,
    labelText: labelResult.text,
    origin: mission.position,
  };
}

/**
 * Render a single mission part (mesh + physics body)
 */
function renderPart(
  part: MissionPart,
  missionOrigin: { x: number; z: number },
  scene: Scene,
  world: RAPIER.World,
  shadowGenerator: ShadowGenerator | null
): RenderedMissionPart {
  // World position = mission origin + part offset
  const wx = missionOrigin.x + part.position.x;
  const wy = part.position.y;
  const wz = missionOrigin.z + part.position.z;

  // Create mesh
  const mesh = createMesh(part, scene);
  mesh.position.set(wx, wy, wz);

  if (part.rotation) {
    mesh.rotation.set(part.rotation.x, part.rotation.y, part.rotation.z);
  }

  // Handle shadow casting and materials
  const hasChildren = part.children && part.children.length > 0;

  if (hasChildren) {
    // Compound part: children already have materials from createMesh
    // Add shadow casting for each child mesh
    if (shadowGenerator && part.type !== "trigger") {
      for (const child of mesh.getChildMeshes()) {
        shadowGenerator.addShadowCaster(child as Mesh);
      }
    }
  } else {
    // Simple part: apply material to the single mesh
    if (shadowGenerator && part.type !== "trigger") {
      shadowGenerator.addShadowCaster(mesh);
    }

    const mat = new StandardMaterial(`mat_${part.id}`, scene);
    mat.diffuseColor = new Color3(part.color.r, part.color.g, part.color.b);

    if (part.type === "trigger") {
      mat.alpha = 0.35;
      mat.emissiveColor = new Color3(
        part.color.r * 0.6,
        part.color.g * 0.6,
        part.color.b * 0.6
      );
      mat.wireframe = false;
    } else {
      mat.specularColor = new Color3(0.15, 0.15, 0.15);
      mat.emissiveColor = new Color3(
        part.color.r * 0.05,
        part.color.g * 0.05,
        part.color.b * 0.05
      );
    }
    mesh.material = mat;
  }

  // Create physics body
  let rigidBody: RAPIER.RigidBody | null = null;
  let joint: RAPIER.ImpulseJoint | null = null;

  switch (part.type) {
    case "static": {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(wx, wy, wz);
      rigidBody = world.createRigidBody(bodyDesc);
      const colliderDesc = createColliderDesc(part);
      if (colliderDesc) {
        colliderDesc.setFriction(part.friction ?? 0.5);
        colliderDesc.setRestitution(part.restitution ?? 0.1);
        world.createCollider(colliderDesc, rigidBody);
      }
      break;
    }

    case "dynamic": {
      // Dynamic bodies: low damping so robot can push them easily
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(wx, wy, wz)
        .setLinearDamping(0.5)   // low damping for easy pushing
        .setAngularDamping(0.5); // low damping for easy toppling
      rigidBody = world.createRigidBody(bodyDesc);
      const colliderDesc = createColliderDesc(part);
      if (colliderDesc) {
        colliderDesc.setMass(part.mass ?? 0.02);  // lighter default mass
        colliderDesc.setFriction(part.friction ?? 0.3);  // lower friction
        colliderDesc.setRestitution(part.restitution ?? 0.2);  // slightly bouncier
        world.createCollider(colliderDesc, rigidBody);
      }
      break;
    }

    case "hinge": {
      // Hinge bodies: lower damping so robot can push/flip them
      const angDamping = part.hingeDamping ?? 0.8;
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(wx, wy, wz)
        .setLinearDamping(2.0)
        .setAngularDamping(angDamping);
      rigidBody = world.createRigidBody(bodyDesc);
      const colliderDesc = createColliderDesc(part);
      if (colliderDesc) {
        colliderDesc.setMass(part.mass ?? 0.015);  // lighter for easier flipping
        colliderDesc.setFriction(part.friction ?? 0.3);
        world.createCollider(colliderDesc, rigidBody);
      }

      // Create a fixed anchor body at the hinge pivot point
      // If hingeAnchorOffset is specified, the anchor is at (part center + offset)
      // and the joint connects from anchor to the dynamic body with the offset
      const offset = part.hingeAnchorOffset ?? { x: 0, y: 0, z: 0 };
      const anchorX = wx + offset.x;
      const anchorY = wy + offset.y;
      const anchorZ = wz + offset.z;

      const anchorDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(anchorX, anchorY, anchorZ);
      const anchorBody = world.createRigidBody(anchorDesc);

      // Create revolute joint
      const axis = getHingeAxis(part.hingeAxis ?? "x");
      const jointData = RAPIER.JointData.revolute(
        new RAPIER.Vector3(0, 0, 0),       // anchor point on the fixed body (at its origin)
        new RAPIER.Vector3(offset.x, offset.y, offset.z), // anchor point on the dynamic body (offset from its center)
        axis
      );

      joint = world.createImpulseJoint(jointData, anchorBody, rigidBody, true);

      // Apply limits if specified
      if (part.hingeLimits && joint) {
        const revJoint = joint as RAPIER.RevoluteImpulseJoint;
        revJoint.setLimits(part.hingeLimits.min, part.hingeLimits.max);
      }
      break;
    }

    case "trigger": {
      // Triggers are sensor-only (no physical collision response)
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(wx, wy, wz);
      rigidBody = world.createRigidBody(bodyDesc);
      const colliderDesc = createColliderDesc(part);
      if (colliderDesc) {
        colliderDesc.setSensor(true);
        world.createCollider(colliderDesc, rigidBody);
      }
      break;
    }
  }

  // Save initial position/rotation for reset
  const initPos = rigidBody
    ? rigidBody.translation()
    : { x: wx, y: wy, z: wz };
  const initRot = rigidBody
    ? rigidBody.rotation()
    : { x: 0, y: 0, z: 0, w: 1 };

  return {
    id: part.id,
    mesh,
    rigidBody,
    joint,
    definition: part,
    initialPosition: { x: initPos.x, y: initPos.y, z: initPos.z },
    initialRotation: { x: initRot.x, y: initRot.y, z: initRot.z, w: initRot.w },
  };
}

/**
 * Create a simple shape mesh
 */
function createSimpleShape(
  name: string,
  shape: "box" | "cylinder" | "sphere",
  size: { x: number; y: number; z: number },
  scene: Scene
): Mesh {
  switch (shape) {
    case "box":
      return MeshBuilder.CreateBox(name, {
        width: size.x,
        height: size.y,
        depth: size.z,
      }, scene);
    case "cylinder":
      return MeshBuilder.CreateCylinder(name, {
        diameter: size.x * 2,
        height: size.y,
        tessellation: 12,
      }, scene);
    case "sphere":
      return MeshBuilder.CreateSphere(name, {
        diameter: size.x * 2,
        segments: 10,
      }, scene);
    default:
      return MeshBuilder.CreateBox(name, {
        width: size.x,
        height: size.y,
        depth: size.z,
      }, scene);
  }
}

/**
 * Create a Babylon.js mesh from a part definition.
 * If the part has compound children, creates a parent mesh with child sub-meshes.
 * The parent mesh is used for physics (invisible if children exist).
 */
function createMesh(part: MissionPart, scene: Scene): Mesh {
  // If no children, create a simple shape as before
  if (!part.children || part.children.length === 0) {
    return createSimpleShape(part.id, part.shape, part.size, scene);
  }

  // Compound part: create an invisible parent mesh for physics bounding
  const parent = createSimpleShape(part.id, part.shape, part.size, scene);
  parent.isVisible = false; // physics-only; children provide visuals

  // Create each child as a visible sub-mesh parented to the parent
  for (let i = 0; i < part.children.length; i++) {
    const child = part.children[i];
    const childMesh = createSimpleShape(
      `${part.id}_child_${i}`,
      child.shape,
      child.size,
      scene
    );
    childMesh.position.set(child.position.x, child.position.y, child.position.z);
    if (child.rotation) {
      childMesh.rotation.set(child.rotation.x, child.rotation.y, child.rotation.z);
    }

    // Each child gets its own colored material
    const childMat = new StandardMaterial(`mat_${part.id}_child_${i}`, scene);
    childMat.diffuseColor = new Color3(child.color.r, child.color.g, child.color.b);
    childMat.specularColor = new Color3(0.15, 0.15, 0.15);
    childMat.emissiveColor = new Color3(
      child.color.r * 0.05,
      child.color.g * 0.05,
      child.color.b * 0.05
    );
    childMesh.material = childMat;

    // Parent the child to the main mesh so it moves/rotates with physics
    childMesh.parent = parent;
  }

  return parent;
}

/**
 * Create a Rapier collider descriptor from a part definition
 */
function createColliderDesc(part: MissionPart): RAPIER.ColliderDesc | null {
  switch (part.shape) {
    case "box":
      return RAPIER.ColliderDesc.cuboid(
        part.size.x / 2,
        part.size.y / 2,
        part.size.z / 2
      );

    case "cylinder":
      return RAPIER.ColliderDesc.cylinder(
        part.size.y / 2,
        part.size.x
      );

    case "sphere":
      return RAPIER.ColliderDesc.ball(part.size.x);

    default:
      return null;
  }
}

/**
 * Get the Rapier axis vector for a hinge
 */
function getHingeAxis(axis: "x" | "y" | "z"): RAPIER.Vector3 {
  switch (axis) {
    case "x": return new RAPIER.Vector3(1, 0, 0);
    case "y": return new RAPIER.Vector3(0, 1, 0);
    case "z": return new RAPIER.Vector3(0, 0, 1);
  }
}

/**
 * Create a floating label above a mission using Babylon GUI for pixel-perfect crisp text.
 * Shows only the mission ID (e.g. "M01") to keep labels compact.
 */
function createMissionLabel(mission: MissionDefinition, scene: Scene): { anchor: Mesh; rect: Rectangle; text: TextBlock } {
  const labelHeight = 0.25;

  // Invisible anchor mesh positioned above the mission
  const anchor = MeshBuilder.CreatePlane(`labelAnchor_${mission.id}`, { width: 0.01, height: 0.01 }, scene);
  anchor.position.set(mission.position.x, labelHeight, mission.position.z);
  anchor.isVisible = false;

  const gui = getGuiTexture(scene);

  // Container rectangle — dark pill background
  const rect = new Rectangle(`labelRect_${mission.id}`);
  rect.width = "68px";
  rect.height = "28px";
  rect.cornerRadius = 6;
  rect.color = "#00e5ff";
  rect.thickness = 1.5;
  rect.background = "rgba(0, 8, 16, 0.92)";
  rect.shadowColor = "rgba(0, 229, 255, 0.4)";
  rect.shadowBlur = 6;
  rect.linkOffsetY = -20;
  gui.addControl(rect);
  rect.linkWithMesh(anchor);

  // Mission ID text — crisp, bold, bright cyan
  const text = new TextBlock(`labelText_${mission.id}`, mission.id);
  text.color = "#00ffff";
  text.fontSize = 16;
  text.fontWeight = "bold";
  text.fontFamily = "'Courier New', monospace";
  text.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_CENTER;
  text.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_CENTER;
  rect.addControl(text);

  return { anchor: anchor as unknown as Mesh, rect, text };
}

/**
 * Reset all mission objects back to their initial positions and states.
 * Call this on match/scene reset.
 */
export function resetMissionObjects(missions: RenderedMission[]): void {
  for (const mission of missions) {
    for (const part of mission.parts) {
      if (part.rigidBody && (part.definition.type === "dynamic" || part.definition.type === "hinge")) {
        const ip = part.initialPosition;
        const ir = part.initialRotation;
        // Reset physics body position, rotation, and velocities
        part.rigidBody.setTranslation(
          new RAPIER.Vector3(ip.x, ip.y, ip.z),
          true
        );
        part.rigidBody.setRotation(
          new RAPIER.Quaternion(ir.x, ir.y, ir.z, ir.w),
          true
        );
        part.rigidBody.setLinvel(new RAPIER.Vector3(0, 0, 0), true);
        part.rigidBody.setAngvel(new RAPIER.Vector3(0, 0, 0), true);
        // Wake the body so it settles properly
        part.rigidBody.wakeUp();

        // Also sync the mesh immediately
        if (part.mesh instanceof Mesh) {
          part.mesh.position.set(ip.x, ip.y, ip.z);
          if (!part.mesh.rotationQuaternion) {
            part.mesh.rotationQuaternion = new Quaternion(ir.x, ir.y, ir.z, ir.w);
          } else {
            part.mesh.rotationQuaternion.set(ir.x, ir.y, ir.z, ir.w);
          }
        }
      }
    }
  }
}

/**
 * Sync all rendered mission meshes with their physics bodies
 */
export function syncMissionPhysics(missions: RenderedMission[]): void {
  for (const mission of missions) {
    for (const part of mission.parts) {
      if (part.rigidBody && (part.definition.type === "dynamic" || part.definition.type === "hinge")) {
        const pos = part.rigidBody.translation();
        const rot = part.rigidBody.rotation();
        if (part.mesh instanceof Mesh) {
          part.mesh.position.set(pos.x, pos.y, pos.z);
          if (!part.mesh.rotationQuaternion) {
            part.mesh.rotationQuaternion = new Quaternion(rot.x, rot.y, rot.z, rot.w);
          } else {
            part.mesh.rotationQuaternion.set(rot.x, rot.y, rot.z, rot.w);
          }
        }
      }
    }
  }
}

// ─── Label Color Constants ───────────────────────────────────────
const LABEL_COLOR_NONE = { border: "#00e5ff", text: "#00ffff", shadow: "rgba(0, 229, 255, 0.4)", bg: "rgba(0, 8, 16, 0.92)" };
const LABEL_COLOR_PARTIAL = { border: "#f5a623", text: "#ffc857", shadow: "rgba(245, 166, 35, 0.45)", bg: "rgba(16, 10, 0, 0.92)" };
const LABEL_COLOR_COMPLETE = { border: "#34d399", text: "#6ee7b7", shadow: "rgba(52, 211, 153, 0.45)", bg: "rgba(0, 16, 8, 0.92)" };

/**
 * Update the floating label colors for all missions based on completion status.
 * Call this periodically (e.g. at ~5Hz in the render loop state update).
 *
 * @param missions - rendered missions with labelRect/labelText references
 * @param matchMissions - mission score states from the scoring engine
 */
export function updateMissionLabelColors(
  missions: RenderedMission[],
  matchMissions: { missionId: string; conditions: { completed: boolean }[] }[]
): void {
  for (const rm of missions) {
    if (!rm.labelRect || !rm.labelText) continue;

    const matchMission = matchMissions.find((m) => m.missionId === rm.id);
    if (!matchMission) continue;

    const totalConditions = matchMission.conditions.length;
    const completedCount = matchMission.conditions.filter((c) => c.completed).length;

    let colors: typeof LABEL_COLOR_NONE;
    if (totalConditions > 0 && completedCount === totalConditions) {
      colors = LABEL_COLOR_COMPLETE;
    } else if (completedCount > 0) {
      colors = LABEL_COLOR_PARTIAL;
    } else {
      colors = LABEL_COLOR_NONE;
    }

    // Only update if color actually changed (avoid unnecessary redraws)
    if (rm.labelRect.color !== colors.border) {
      rm.labelRect.color = colors.border;
      rm.labelRect.background = colors.bg;
      rm.labelRect.shadowColor = colors.shadow;
      rm.labelText.color = colors.text;
    }
  }
}
