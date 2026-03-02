/**
 * Mission Animations — Phase 6
 *
 * Provides smooth Babylon.js animations for Category B mission actions.
 * Each mission has stage-specific animations (position moves, rotation flips,
 * scale pulses) plus a universal green flash on completion.
 *
 * Usage:
 *   1. Call `playMissionAnimation(missionId, stage, renderedMissions, scene)`
 *   2. It returns a Promise that resolves when the animation finishes
 *   3. The E key handler should await this before scoring
 *
 * Animation lock:
 *   `isAnimationPlaying()` returns true while any animation is in progress.
 *   The E key handler should check this to prevent double-triggers.
 */

import {
  Scene,
  Animation,
  Color3,
  StandardMaterial,
  Mesh,
  Vector3,
  EasingFunction,
  CubicEase,
  TransformNode,
} from "@babylonjs/core";
import type { RenderedMission, RenderedMissionPart } from "./missionRenderer";
import RAPIER from "@dimforge/rapier3d-compat";

// ─── Animation Lock ──────────────────────────────────────────────
let _animPlaying = false;

export function isAnimationPlaying(): boolean {
  return _animPlaying;
}

// ─── Helper: find a rendered mission + part by ID ────────────────
function findMission(missions: RenderedMission[], missionId: string): RenderedMission | undefined {
  return missions.find((m) => m.id === missionId);
}

function findPart(mission: RenderedMission, partId: string): RenderedMissionPart | undefined {
  return mission.parts.find((p) => p.id === partId);
}

// ─── Helper: get all visible meshes for a part (handles compound) ─
function getVisibleMeshes(part: RenderedMissionPart): Mesh[] {
  const meshes: Mesh[] = [];
  if (part.mesh instanceof Mesh) {
    // If the mesh itself is visible, include it
    if (part.mesh.isVisible) {
      meshes.push(part.mesh);
    }
    // Also include visible child meshes (compound parts)
    for (const child of part.mesh.getChildMeshes()) {
      if (child instanceof Mesh && child.isVisible) {
        meshes.push(child);
      }
    }
  }
  return meshes;
}

// ─── Universal: Green Flash + Scale Pulse ────────────────────────
/**
 * Flash all visible meshes of a part green, then restore original colors.
 * Also does a quick scale pulse (1.0 → 1.3 → 1.0).
 */
async function flashGreen(part: RenderedMissionPart, scene: Scene, duration: number = 400): Promise<void> {
  const meshes = getVisibleMeshes(part);
  if (meshes.length === 0) return;

  // Save original colors
  const origColors: { mesh: Mesh; diffuse: Color3; emissive: Color3 }[] = [];
  for (const m of meshes) {
    const mat = m.material as StandardMaterial | null;
    if (mat) {
      origColors.push({
        mesh: m,
        diffuse: mat.diffuseColor.clone(),
        emissive: mat.emissiveColor.clone(),
      });
      // Flash to green
      mat.diffuseColor = new Color3(0.2, 1.0, 0.4);
      mat.emissiveColor = new Color3(0.1, 0.6, 0.2);
    }
  }

  // Scale pulse on the parent mesh/node
  const node = part.mesh;
  const origScale = node.scaling.clone();

  return new Promise<void>((resolve) => {
    // Phase 1: scale up (half duration)
    const halfMs = duration / 2;
    const scaleUp = new Animation(
      "flashScaleUp", "scaling", 60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    const frames1 = Math.round((halfMs / 1000) * 60);
    scaleUp.setKeys([
      { frame: 0, value: origScale.clone() },
      { frame: frames1, value: origScale.scale(1.25) },
    ]);
    const ease1 = new CubicEase();
    ease1.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    scaleUp.setEasingFunction(ease1);

    scene.beginDirectAnimation(node, [scaleUp], 0, frames1, false, 1, () => {
      // Phase 2: scale back down + restore colors
      const scaleDown = new Animation(
        "flashScaleDown", "scaling", 60,
        Animation.ANIMATIONTYPE_VECTOR3,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      scaleDown.setKeys([
        { frame: 0, value: origScale.scale(1.25) },
        { frame: frames1, value: origScale.clone() },
      ]);
      const ease2 = new CubicEase();
      ease2.setEasingMode(EasingFunction.EASINGMODE_EASEIN);
      scaleDown.setEasingFunction(ease2);

      scene.beginDirectAnimation(node, [scaleDown], 0, frames1, false, 1, () => {
        // Restore original colors
        for (const { mesh, diffuse, emissive } of origColors) {
          const mat = mesh.material as StandardMaterial | null;
          if (mat) {
            mat.diffuseColor = diffuse;
            mat.emissiveColor = emissive;
          }
        }
        node.scaling.copyFrom(origScale);
        resolve();
      });
    });
  });
}

// ─── Helper: animate a part's position smoothly ──────────────────
async function animatePosition(
  part: RenderedMissionPart,
  scene: Scene,
  targetPos: Vector3,
  durationMs: number = 500
): Promise<void> {
  const node = part.mesh;
  const startPos = node.position.clone();
  const frames = Math.round((durationMs / 1000) * 60);

  return new Promise<void>((resolve) => {
    const anim = new Animation(
      "movePos", "position", 60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    anim.setKeys([
      { frame: 0, value: startPos },
      { frame: frames, value: targetPos },
    ]);
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    anim.setEasingFunction(ease);

    scene.beginDirectAnimation(node, [anim], 0, frames, false, 1, () => {
      node.position.copyFrom(targetPos);
      // Also update physics body if present
      if (part.rigidBody) {
        part.rigidBody.setTranslation(
          new RAPIER.Vector3(targetPos.x, targetPos.y, targetPos.z),
          true
        );
        part.rigidBody.setLinvel(new RAPIER.Vector3(0, 0, 0), true);
        part.rigidBody.setAngvel(new RAPIER.Vector3(0, 0, 0), true);
      }
      resolve();
    });
  });
}

// ─── Helper: animate a part's Y-axis rotation ───────────────────
async function animateRotationY(
  part: RenderedMissionPart,
  scene: Scene,
  targetAngle: number,
  durationMs: number = 400
): Promise<void> {
  const node = part.mesh;
  const startY = node.rotation?.y ?? 0;
  const frames = Math.round((durationMs / 1000) * 60);

  return new Promise<void>((resolve) => {
    const anim = new Animation(
      "rotY", "rotation.y", 60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    anim.setKeys([
      { frame: 0, value: startY },
      { frame: frames, value: targetAngle },
    ]);
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    anim.setEasingFunction(ease);

    scene.beginDirectAnimation(node, [anim], 0, frames, false, 1, () => {
      resolve();
    });
  });
}

// ─── Helper: animate a part's X-axis rotation (for flipping) ────
async function animateRotationX(
  part: RenderedMissionPart,
  scene: Scene,
  targetAngle: number,
  durationMs: number = 400
): Promise<void> {
  const node = part.mesh;
  const startX = node.rotation?.x ?? 0;
  const frames = Math.round((durationMs / 1000) * 60);

  return new Promise<void>((resolve) => {
    const anim = new Animation(
      "rotX", "rotation.x", 60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    anim.setKeys([
      { frame: 0, value: startX },
      { frame: frames, value: targetAngle },
    ]);
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    anim.setEasingFunction(ease);

    scene.beginDirectAnimation(node, [anim], 0, frames, false, 1, () => {
      resolve();
    });
  });
}

// ─── Helper: animate vertical lift ──────────────────────────────
async function animateLift(
  part: RenderedMissionPart,
  scene: Scene,
  liftHeight: number,
  durationMs: number = 400
): Promise<void> {
  const currentPos = part.mesh.position.clone();
  const targetPos = currentPos.clone();
  targetPos.y += liftHeight;
  return animatePosition(part, scene, targetPos, durationMs);
}

// ═══════════════════════════════════════════════════════════════════
// ─── MISSION-SPECIFIC ANIMATIONS ─────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

/** M01 Coral Nursery — Stage 1: Tree rises onto support, Stage 2: Buds flip open */
async function animateM01(mission: RenderedMission, stage: number, scene: Scene): Promise<void> {
  if (stage === 0) {
    // Stage 1: Tree rises up
    const tree = findPart(mission, "M01_tree");
    if (tree) {
      await animateLift(tree, scene, 0.04, 500);
      await flashGreen(tree, scene, 350);
    }
  } else if (stage === 1) {
    // Stage 2: Buds flip (rotate X)
    const buds = findPart(mission, "M01_buds");
    if (buds) {
      await animateRotationX(buds, scene, Math.PI / 3, 300);
      await flashGreen(buds, scene, 300);
    }
  }
}

/** M04 Scuba Diver — Stage 1: Diver lifts and moves to safe zone */
async function animateM04(mission: RenderedMission, stage: number, scene: Scene): Promise<void> {
  if (stage === 0) {
    const diver = findPart(mission, "M04_diver");
    if (diver) {
      // Lift up, then move sideways
      await animateLift(diver, scene, 0.05, 400);
      const target = diver.mesh.position.clone();
      target.x += 0.08;
      target.z += 0.04;
      await animatePosition(diver, scene, target, 400);
      await flashGreen(diver, scene, 300);
    }
  }
}

/** M05 Angler Fish — Stage 1: Fish slides into wreck */
async function animateM05(mission: RenderedMission, stage: number, scene: Scene): Promise<void> {
  if (stage === 0) {
    const fish = findPart(mission, "M05_fish");
    if (fish) {
      const target = fish.mesh.position.clone();
      target.x += 0.06;
      target.y += 0.02;
      await animatePosition(fish, scene, target, 700);
      await flashGreen(fish, scene, 300);
    }
  }
}

/** M08 Artificial Habitat — Stage 1: First segment stacks, Stage 2: Second stacks on top */
async function animateM08(mission: RenderedMission, stage: number, scene: Scene): Promise<void> {
  const segIds = ["M08_seg1", "M08_seg2", "M08_seg3", "M08_seg4"];
  const segId = segIds[stage];
  if (segId) {
    const seg = findPart(mission, segId);
    if (seg) {
      await animateLift(seg, scene, 0.02 * (stage + 1), 300);
      await flashGreen(seg, scene, 250);
    }
  }
}

/** M09 Unexpected Encounter — Stage 1: Creature pops up and slides */
async function animateM09(mission: RenderedMission, stage: number, scene: Scene): Promise<void> {
  if (stage === 0) {
    const creature = findPart(mission, "M09_creature");
    if (creature) {
      // Pop up
      await animateLift(creature, scene, 0.04, 300);
      // Slide to cold seep
      const target = creature.mesh.position.clone();
      target.x -= 0.06;
      target.z += 0.04;
      await animatePosition(creature, scene, target, 500);
      await flashGreen(creature, scene, 300);
    }
  }
}

/** M11 Sonar Discovery — Stage 1: First panel flips, Stage 2: Second panel flips */
async function animateM11(mission: RenderedMission, stage: number, scene: Scene): Promise<void> {
  const panelId = stage === 0 ? "M11_whale1" : "M11_whale2";
  const panel = findPart(mission, panelId);
  if (panel) {
    await animateRotationY(panel, scene, Math.PI / 2, 400);
    await flashGreen(panel, scene, 300);
  }
}

/** M12 Feed the Whale — Each stage: one krill moves into mouth */
async function animateM12(mission: RenderedMission, stage: number, scene: Scene): Promise<void> {
  const krillIds = ["M12_krill1", "M12_krill2", "M12_krill3", "M12_krill4", "M12_krill5"];
  const krillId = krillIds[stage];
  if (krillId) {
    const krill = findPart(mission, krillId);
    const mouth = findPart(mission, "M12_mouth");
    if (krill && mouth) {
      const mouthPos = mouth.mesh.position.clone();
      mouthPos.y += 0.02; // slightly above mouth
      await animatePosition(krill, scene, mouthPos, 300);
      await flashGreen(krill, scene, 250);
    } else if (krill) {
      // No mouth part found, just lift
      await animateLift(krill, scene, 0.03, 300);
      await flashGreen(krill, scene, 250);
    }
  }
}

/** M14 Sample Collection — Each stage: one sample lifts off */
async function animateM14(mission: RenderedMission, stage: number, scene: Scene): Promise<void> {
  const sampleIds = ["M14_water", "M14_seabed", "M14_plankton", "M14_trident1", "M14_trident2"];
  const sampleId = sampleIds[stage];
  if (sampleId) {
    const sample = findPart(mission, sampleId);
    if (sample) {
      await animateLift(sample, scene, 0.04, 300);
      await flashGreen(sample, scene, 250);
    }
  }
}

/** M15 Research Vessel — Stage 1: Latch connects, items slide in */
async function animateM15(mission: RenderedMission, stage: number, scene: Scene): Promise<void> {
  if (stage === 0) {
    const latch = findPart(mission, "M15_latch");
    if (latch) {
      await animateRotationX(latch, scene, Math.PI / 4, 400);
      await flashGreen(latch, scene, 300);
    }
  } else if (stage === 1) {
    // Items slide into cargo
    const cargo = findPart(mission, "M15_cargo");
    if (cargo) {
      await flashGreen(cargo, scene, 400);
    }
  }
}

// ─── Animation Dispatch Map ──────────────────────────────────────
const ANIMATION_MAP: Record<string, (mission: RenderedMission, stage: number, scene: Scene) => Promise<void>> = {
  M01: animateM01,
  M04: animateM04,
  M05: animateM05,
  M08: animateM08,
  M09: animateM09,
  M11: animateM11,
  M12: animateM12,
  M14: animateM14,
  M15: animateM15,
};

// ═══════════════════════════════════════════════════════════════════
// ─── PUBLIC API ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

/**
 * Play the animation for a specific mission stage.
 * Returns a Promise that resolves when the animation finishes.
 *
 * @param missionId - e.g. "M01"
 * @param stage - 0-indexed stage number (0 = first uncompleted condition)
 * @param missions - array of RenderedMission from the scene
 * @param scene - Babylon.js Scene
 */
export async function playMissionAnimation(
  missionId: string,
  stage: number,
  missions: RenderedMission[],
  scene: Scene
): Promise<void> {
  if (_animPlaying) return; // already animating

  const mission = findMission(missions, missionId);
  if (!mission) return;

  const animFn = ANIMATION_MAP[missionId];
  if (!animFn) {
    // No specific animation — just flash the first visible part
    const firstPart = mission.parts.find((p) => p.definition.type !== "trigger");
    if (firstPart) {
      _animPlaying = true;
      try {
        await flashGreen(firstPart, scene, 400);
      } finally {
        _animPlaying = false;
      }
    }
    return;
  }

  _animPlaying = true;
  try {
    await animFn(mission, stage, scene);
  } finally {
    _animPlaying = false;
  }
}
