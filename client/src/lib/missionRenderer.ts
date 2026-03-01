/**
 * Mission Renderer — Builds 3D meshes and physics bodies from mission definitions
 * 
 * Creates Babylon.js meshes and Rapier rigid bodies for each mission part,
 * handling static, dynamic, hinge, and trigger types.
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
    if (rendered.mesh instanceof Mesh || rendered.mesh instanceof TransformNode) {
      // Don't parent physics-driven meshes to the node (they follow physics)
      // But we track them for cleanup
    }
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
    // Trigger zones are semi-transparent
    mat.alpha = 0.25;
    mat.emissiveColor = new Color3(
      part.color.r * 0.3,
      part.color.g * 0.3,
      part.color.b * 0.3
    );
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
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(wx, wy, wz)
        .setLinearDamping(2.0)
        .setAngularDamping(2.0);
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
      // Create a dynamic body that's constrained by a revolute joint
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(wx, wy, wz)
        .setLinearDamping(3.0)
        .setAngularDamping(1.5);
      rigidBody = world.createRigidBody(bodyDesc);
      const colliderDesc = createColliderDesc(part);
      if (colliderDesc) {
        colliderDesc.setMass(part.mass ?? 0.03);
        colliderDesc.setFriction(part.friction ?? 0.5);
        world.createCollider(colliderDesc, rigidBody);
      }

      // Create a fixed anchor body at the same position
      const anchorDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(wx, wy, wz);
      const anchorBody = world.createRigidBody(anchorDesc);

      // Create revolute joint
      const axis = getHingeAxis(part.hingeAxis ?? "x");
      const jointData = RAPIER.JointData.revolute(
        new RAPIER.Vector3(0, 0, 0), // anchor1 (on anchor body)
        new RAPIER.Vector3(0, 0, 0), // anchor2 (on dynamic body)
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
  const labelHeight = 0.18;
  const plane = MeshBuilder.CreatePlane(`label_${mission.id}`, {
    width: 0.12,
    height: 0.025,
  }, scene);

  const mat = new StandardMaterial(`labelMat_${mission.id}`, scene);
  mat.diffuseColor = new Color3(0, 0, 0);
  mat.emissiveColor = new Color3(0, 0.8, 1.0);
  mat.alpha = 0.85;
  mat.backFaceCulling = false;
  plane.material = mat;

  plane.position.set(mission.position.x, labelHeight, mission.position.z);
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;

  // Create a dynamic texture for the label text
  const textureSize = 256;
  const dynamicTexture = new DynamicTexture(
    `labelTex_${mission.id}`,
    { width: textureSize, height: 64 },
    scene,
    false
  );
  dynamicTexture.hasAlpha = true;
  const ctx = dynamicTexture.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, textureSize, 64);
  ctx.font = "bold 24px monospace";
  ctx.fillStyle = "#00d4ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(mission.id, textureSize / 2, 32);
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
