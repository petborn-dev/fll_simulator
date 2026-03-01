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
  DynamicTexture,
} from "@babylonjs/core";
import RAPIER from "@dimforge/rapier3d-compat";
import type { MissionDefinition, MissionPart } from "./missions";

export interface RenderedMissionPart {
  id: string;
  mesh: Mesh | TransformNode;
  rigidBody: RAPIER.RigidBody | null;
  joint: RAPIER.ImpulseJoint | null;
  definition: MissionPart;
}

export interface RenderedMission {
  id: string;
  name: string;
  parts: RenderedMissionPart[];
  labelMesh: Mesh | null;
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
  const labelMesh = createMissionLabel(mission, scene);

  for (const part of mission.parts) {
    const rendered = renderPart(part, mission.position, scene, world, shadowGenerator);
    renderedParts.push(rendered);
  }

  return {
    id: mission.id,
    name: mission.name,
    parts: renderedParts,
    labelMesh,
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

  // Add shadow casting for non-trigger parts
  if (shadowGenerator && part.type !== "trigger") {
    shadowGenerator.addShadowCaster(mesh);
  }

  // Create material
  const mat = new StandardMaterial(`mat_${part.id}`, scene);
  mat.diffuseColor = new Color3(part.color.r, part.color.g, part.color.b);

  if (part.type === "trigger") {
    // Trigger zones are semi-transparent with pulsing glow
    mat.alpha = 0.35;
    mat.emissiveColor = new Color3(
      part.color.r * 0.6,
      part.color.g * 0.6,
      part.color.b * 0.6
    );
    // Add wireframe overlay for better visibility
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
      // Dynamic bodies: lower damping for more realistic sliding/toppling
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(wx, wy, wz)
        .setLinearDamping(1.0)   // reduced from 2.0 for more realistic sliding
        .setAngularDamping(1.0); // reduced from 2.0 for more realistic toppling
      rigidBody = world.createRigidBody(bodyDesc);
      const colliderDesc = createColliderDesc(part);
      if (colliderDesc) {
        colliderDesc.setMass(part.mass ?? 0.05);
        colliderDesc.setFriction(part.friction ?? 0.5);
        colliderDesc.setRestitution(part.restitution ?? 0.1);
        world.createCollider(colliderDesc, rigidBody);
      }
      break;
    }

    case "hinge": {
      // Hinge bodies: use per-part damping if specified
      const angDamping = part.hingeDamping ?? 1.5;
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(wx, wy, wz)
        .setLinearDamping(3.0)
        .setAngularDamping(angDamping);
      rigidBody = world.createRigidBody(bodyDesc);
      const colliderDesc = createColliderDesc(part);
      if (colliderDesc) {
        colliderDesc.setMass(part.mass ?? 0.03);
        colliderDesc.setFriction(part.friction ?? 0.5);
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

  return {
    id: part.id,
    mesh,
    rigidBody,
    joint,
    definition: part,
  };
}

/**
 * Create a Babylon.js mesh from a part definition
 */
function createMesh(part: MissionPart, scene: Scene): Mesh {
  switch (part.shape) {
    case "box":
      return MeshBuilder.CreateBox(part.id, {
        width: part.size.x,
        height: part.size.y,
        depth: part.size.z,
      }, scene);

    case "cylinder":
      return MeshBuilder.CreateCylinder(part.id, {
        diameter: part.size.x * 2,
        height: part.size.y,
        tessellation: 12,
      }, scene);

    case "sphere":
      return MeshBuilder.CreateSphere(part.id, {
        diameter: part.size.x * 2,
        segments: 10,
      }, scene);

    default:
      return MeshBuilder.CreateBox(part.id, {
        width: part.size.x,
        height: part.size.y,
        depth: part.size.z,
      }, scene);
  }
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
 * Create a floating label above a mission
 */
function createMissionLabel(mission: MissionDefinition, scene: Scene): Mesh {
  const labelHeight = 0.22;
  // High-resolution texture for crisp text (2x previous)
  const texW = 1024;
  const texH = 256;
  // Larger plane in world space for readability
  const planeW = 0.28;
  const planeH = 0.07;

  const plane = MeshBuilder.CreatePlane(`label_${mission.id}`, {
    width: planeW,
    height: planeH,
  }, scene);

  const mat = new StandardMaterial(`labelMat_${mission.id}`, scene);
  mat.diffuseColor = new Color3(0, 0, 0);
  mat.emissiveColor = new Color3(1, 1, 1);
  mat.alpha = 0.95;
  mat.backFaceCulling = false;
  mat.disableLighting = true;
  plane.material = mat;

  plane.position.set(mission.position.x, labelHeight, mission.position.z);
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;

  // Create high-res dynamic texture
  const dynamicTexture = new DynamicTexture(
    `labelTex_${mission.id}`,
    { width: texW, height: texH },
    scene,
    true // generateMipMaps for better quality at distance
  );
  dynamicTexture.hasAlpha = true;
  const ctx = dynamicTexture.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, texW, texH);

  // Draw rounded background pill with strong contrast
  const r = 40;
  const pad = 16;
  ctx.beginPath();
  ctx.moveTo(pad + r, pad);
  ctx.lineTo(texW - pad - r, pad);
  ctx.quadraticCurveTo(texW - pad, pad, texW - pad, pad + r);
  ctx.lineTo(texW - pad, texH - pad - r);
  ctx.quadraticCurveTo(texW - pad, texH - pad, texW - pad - r, texH - pad);
  ctx.lineTo(pad + r, texH - pad);
  ctx.quadraticCurveTo(pad, texH - pad, pad, texH - pad - r);
  ctx.lineTo(pad, pad + r);
  ctx.quadraticCurveTo(pad, pad, pad + r, pad);
  ctx.closePath();
  ctx.fillStyle = "rgba(0, 8, 16, 0.92)";
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 212, 255, 0.8)";
  ctx.lineWidth = 5;
  ctx.stroke();

  // Draw mission ID — large, bold, bright cyan
  ctx.font = "bold 88px 'Courier New', monospace";
  ctx.fillStyle = "#00e5ff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(mission.id, pad + 32, texH / 2);

  // Draw mission name — bold, bright white
  const idWidth = ctx.measureText(mission.id).width;
  ctx.font = "bold 56px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  const nameX = pad + 32 + idWidth + 24;
  const maxNameW = texW - nameX - pad - 32;
  // Truncate name if too long
  let displayName = mission.name;
  while (ctx.measureText(displayName).width > maxNameW && displayName.length > 3) {
    displayName = displayName.slice(0, -1);
  }
  if (displayName !== mission.name) displayName += "\u2026";
  ctx.fillText(displayName, nameX, texH / 2 + 4);

  dynamicTexture.update();
  mat.diffuseTexture = dynamicTexture;
  mat.opacityTexture = dynamicTexture;

  return plane;
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
