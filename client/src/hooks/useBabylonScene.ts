/**
 * FLL 3D Simulator — Phase 3.5: Enhanced Game Environment
 * Babylon.js + Rapier physics with official SUBMERGED field mat texture,
 * border walls, differential-drive robot, keyboard controls, camera follow,
 * and enhanced mission physics (hinge joints, flip/topple, trigger zones).
 *
 * MEMORY SAFETY:
 * - All Babylon objects created inside init() are disposed via scene.dispose()
 * - Rapier world is freed via world.free()
 * - Render loop is stopped before disposal
 * - No objects are allocated per-frame (reuse temp vectors)
 * - React state updates are throttled to ~5Hz
 * - HMR re-mounts are handled by the disposed flag
 */
import { useEffect, useRef, useCallback, useState } from "react";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  ShadowGenerator,
  Quaternion,
  DynamicTexture,
  Texture,
  TransformNode,
  Mesh,
} from "@babylonjs/core";
import RAPIER from "@dimforge/rapier3d-compat";
import { getSeasonMissions, type MissionDefinition } from "@/lib/missions";
import { renderMissions, syncMissionPhysics, disposeMissionLabelsGUI, resetMissionObjects, updateMissionLabelColors, type RenderedMission } from "@/lib/missionRenderer";
import { ScoringEngine, type MatchState, MATCH_DURATION_SECONDS } from "@/lib/scoringEngine";
import { playMissionAnimation, isAnimationPlaying } from "@/lib/missionAnimations";

// FLL field dimensions in meters (real: 2362mm x 1143mm)
const FIELD_WIDTH = 2.362;
const FIELD_DEPTH = 1.143;
const WALL_HEIGHT = 0.08;
const WALL_THICKNESS = 0.02;

// Robot dimensions (realistic SPIKE Prime compact driving base)
const ROBOT_WIDTH = 0.12;
const ROBOT_LENGTH = 0.15;
const ROBOT_HEIGHT = 0.08;
const WHEEL_RADIUS = 0.028;
const WHEEL_WIDTH = 0.018;
const AXLE_HALF_WIDTH = ROBOT_WIDTH / 2;

// Robot physics
const ROBOT_MASS = 0.8;
const MAX_SPEED = 0.8;
const TURN_SPEED = 4.0;
const PHYSICS_DT = 1 / 60;

// State update interval in ms (~5Hz = 200ms)
const STATE_UPDATE_INTERVAL = 200;

interface RobotState {
  position: { x: number; y: number; z: number };
  heading: number;
  speed: number;
}

/** Info about the nearest interactable (Category B) mission within trigger range */
export interface NearestInteractable {
  missionId: string;
  missionName: string;
  distance: number;
  stagesCompleted: number;
  stagesTotal: number;
}

interface SceneState {
  fps: number;
  physicsStep: number;
  robot: RobotState;
  isReady: boolean;
  keysPressed: Set<string>;
  missionCount: number;
  season: string;
  match: MatchState;
  /** Nearest Category B mission within trigger range, or null if none */
  nearestInteractable: NearestInteractable | null;
}

// Pre-allocated temp vectors to avoid per-frame allocations
const _tmpVec3 = new Vector3();
const _tmpForward = new Vector3(0, 0, -1);

// Track RAPIER init state globally so we only init once
let rapierInitialized = false;
let rapierInitPromise: Promise<void> | null = null;

async function ensureRapierInit() {
  if (rapierInitialized) return;
  if (!rapierInitPromise) {
    rapierInitPromise = RAPIER.init().then(() => {
      rapierInitialized = true;
    });
  }
  await rapierInitPromise;
}

export function useBabylonScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const rapierWorldRef = useRef<RAPIER.World | null>(null);
  const robotBodyRef = useRef<RAPIER.RigidBody | null>(null);
  const robotMeshRef = useRef<TransformNode | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const physicsStepRef = useRef(0);
  const disposedRef = useRef(false);

  const missionsRef = useRef<RenderedMission[]>([]);
  const scoringEngineRef = useRef<ScoringEngine>(new ScoringEngine());

  const [sceneState, setSceneState] = useState<SceneState>({
    fps: 0,
    physicsStep: 0,
    robot: { position: { x: 0, y: 0, z: 0 }, heading: 0, speed: 0 },
    isReady: false,
    keysPressed: new Set(),
    missionCount: 0,
    season: "SUBMERGED 2024-25",
    match: {
      phase: "idle",
      timeRemaining: MATCH_DURATION_SECONDS,
      totalScore: 0,
      missions: [],
      recentEvents: [],
      completedEvents: [],
    },
    nearestInteractable: null,
  });

  const resetScene = useCallback(() => {
    const world = rapierWorldRef.current;
    const robotBody = robotBodyRef.current;
    if (!world || !robotBody) return;

    // Inside the Left Launch Area arc (front-left corner of field)
    // Front of field = -Z (bottom of screen), Left = -X
    const startX = -FIELD_WIDTH / 2 + 0.12;
    const startZ = -(FIELD_DEPTH / 2 - 0.12);
    robotBody.setTranslation(new RAPIER.Vector3(startX, ROBOT_HEIGHT / 2 + 0.005, startZ), true);
    robotBody.setRotation(new RAPIER.Quaternion(0, 0, 0, 1), true);
    robotBody.setLinvel(new RAPIER.Vector3(0, 0, 0), true);
    robotBody.setAngvel(new RAPIER.Vector3(0, 0, 0), true);
    physicsStepRef.current = 0;

    // Reset all mission objects to their initial positions/rotations
    resetMissionObjects(missionsRef.current);

    scoringEngineRef.current.reset();
    scoringEngineRef.current.initMissions(missionsRef.current);
  }, []);

  const startMatch = useCallback(() => {
    // Reset robot to launch area before starting the match
    const robotBody = robotBodyRef.current;
    if (robotBody) {
      const startX = -FIELD_WIDTH / 2 + 0.12;
      const startZ = -(FIELD_DEPTH / 2 - 0.12);
      robotBody.setTranslation(new RAPIER.Vector3(startX, ROBOT_HEIGHT / 2 + 0.005, startZ), true);
      robotBody.setRotation(new RAPIER.Quaternion(0, 0, 0, 1), true);
      robotBody.setLinvel(new RAPIER.Vector3(0, 0, 0), true);
      robotBody.setAngvel(new RAPIER.Vector3(0, 0, 0), true);
    }
    // Reset mission objects to initial positions
    resetMissionObjects(missionsRef.current);
    // Reset and start scoring
    scoringEngineRef.current.reset();
    scoringEngineRef.current.initMissions(missionsRef.current);
    scoringEngineRef.current.start();
  }, []);

  const stopMatch = useCallback(() => {
    scoringEngineRef.current.stop();
  }, []);

  const resetMatch = useCallback(() => {
    scoringEngineRef.current.reset();
    scoringEngineRef.current.initMissions(missionsRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    disposedRef.current = false;
    let engine: Engine | null = null;
    let scene: Scene | null = null;
    let world: RAPIER.World | null = null;
    let resizeHandler: (() => void) | null = null;
    let onKeyDown: ((e: KeyboardEvent) => void) | null = null;
    let onKeyUp: ((e: KeyboardEvent) => void) | null = null;

    async function init() {
      await ensureRapierInit();
      if (disposedRef.current) return;

      // === ENGINE & SCENE ===
      engine = new Engine(canvas!, true, {
        preserveDrawingBuffer: false, // saves memory
        stencil: false,
        antialias: true,
        powerPreference: "high-performance",
      });
      engineRef.current = engine;

      scene = new Scene(engine);
      sceneRef.current = scene;
      scene.clearColor = new Color4(0.04, 0.05, 0.08, 1);
      scene.ambientColor = new Color3(0.15, 0.15, 0.2);
      // Disable features we don't need to save memory
      scene.skipPointerMovePicking = true;
      scene.autoClear = true;
      scene.autoClearDepthAndStencil = true;

      // === CAMERA ===
      const camera = new ArcRotateCamera(
        "camera",
        -Math.PI / 2,
        Math.PI / 7,
        2.0,
        new Vector3(0, 0.0, 0.0),
        scene
      );
      camera.lowerRadiusLimit = 0.5;
      camera.upperRadiusLimit = 5;
      camera.lowerBetaLimit = 0.1;
      camera.upperBetaLimit = Math.PI / 2.1;
      camera.wheelDeltaPercentage = 0.02;
      camera.panningSensibility = 0;
      camera.attachControl(canvas!, true);

      // === LIGHTING ===
      const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
      hemiLight.intensity = 0.5;
      hemiLight.diffuse = new Color3(0.7, 0.72, 0.85);
      hemiLight.groundColor = new Color3(0.15, 0.15, 0.2);

      const dirLight = new DirectionalLight(
        "dirLight",
        new Vector3(-0.5, -1.5, -0.8).normalize(),
        scene
      );
      dirLight.intensity = 0.7;
      dirLight.diffuse = new Color3(0.95, 0.9, 0.8);
      dirLight.position = new Vector3(2, 4, 2);

      const shadowGenerator = new ShadowGenerator(512, dirLight); // reduced from 1024
      shadowGenerator.useBlurExponentialShadowMap = true;
      shadowGenerator.blurKernel = 8; // reduced from 16
      shadowGenerator.darkness = 0.35;

      // === RAPIER WORLD ===
      const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
      world = new RAPIER.World(gravity);
      world.timestep = PHYSICS_DT;
      rapierWorldRef.current = world;

      if (disposedRef.current) {
        cleanup();
        return;
      }

      // === OUTER GROUND ===
      const outerGround = MeshBuilder.CreateGround("outerGround", { width: 8, height: 8 }, scene);
      const outerMat = new StandardMaterial("outerMat", scene);
      outerMat.diffuseColor = new Color3(0.06, 0.07, 0.1);
      outerMat.specularColor = new Color3(0.02, 0.02, 0.03);
      outerGround.material = outerMat;
      outerGround.position.y = -0.001;
      outerGround.receiveShadows = true;

      // === FLL GAME MAT ===
      const fieldMat = createFieldMaterial(scene);
      const field = MeshBuilder.CreateGround(
        "fllField",
        { width: FIELD_WIDTH, height: FIELD_DEPTH, subdivisions: 2 },
        scene
      );
      field.material = fieldMat;
      field.position.y = 0.001;
      field.receiveShadows = true;

      const fieldDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.01, 0);
      const fieldBody = world.createRigidBody(fieldDesc);
      // Physics collider covers mat + home areas on both sides
      const HOME_EXT = 0.35;
      world.createCollider(
        RAPIER.ColliderDesc.cuboid((FIELD_WIDTH + HOME_EXT * 2) / 2, 0.01, FIELD_DEPTH / 2).setFriction(0.8),
        fieldBody
      );

      // === LAUNCH AREA BOUNDARY (visible overlay) ===
      createLaunchAreaOverlay(scene);

      // === BORDER WALLS ===
      createWalls(scene, world, shadowGenerator);

      // === ROBOT ===
      const { robotNode, robotRigidBody } = createRobot(scene, world, shadowGenerator);
      robotMeshRef.current = robotNode;
      robotBodyRef.current = robotRigidBody;

      if (disposedRef.current) {
        cleanup();
        return;
      }

      // === MISSION MODELS ===
      const missionDefs = getSeasonMissions();
      const renderedMissions = renderMissions(missionDefs, scene, world, shadowGenerator);
      missionsRef.current = renderedMissions;

      // === SCORING ENGINE ===
      scoringEngineRef.current.reset();
      scoringEngineRef.current.initMissions(renderedMissions);

      // === KEYBOARD INPUT ===
      onKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "e"].includes(key)) {
          e.preventDefault();
          keysRef.current.add(key);
        }
      };
      onKeyUp = (e: KeyboardEvent) => {
        keysRef.current.delete(e.key.toLowerCase());
      };
      // Use capture phase to get events before Babylon's camera controls can eat them
      window.addEventListener("keydown", onKeyDown, true);
      window.addEventListener("keyup", onKeyUp, true);

      // === RENDER LOOP ===
      // Pre-allocate a reusable quaternion for the render loop
      const _reuseQuat = new Quaternion();
      let lastStateUpdate = 0;
      let lastEKeyAction = 0; // cooldown tracker for E key actions
      const E_KEY_COOLDOWN = 600; // ms between E key triggers
      let eKeyWasDown = false; // track edge (press, not hold)

      engine.runRenderLoop(() => {
        if (disposedRef.current || !world || !scene) return;

        // Apply robot controls (guard against HMR invalidating the ref)
        const currentKeys = keysRef.current;
        if (currentKeys && typeof currentKeys.has === 'function') {
          applyRobotControls(robotRigidBody, currentKeys);
        }

        // Step physics
        world.step();
        physicsStepRef.current++;

        // Sync robot mesh with physics (reuse objects)
        const pos = robotRigidBody.translation();
        const rot = robotRigidBody.rotation();
        robotNode.position.set(pos.x, pos.y, pos.z);
        _reuseQuat.set(rot.x, rot.y, rot.z, rot.w);
        robotNode.rotationQuaternion = _reuseQuat;

        // Sync mission model meshes with physics
        syncMissionPhysics(renderedMissions);

        // Tick scoring engine (checks conditions every frame)
        scoringEngineRef.current.tick(renderedMissions, world);

        // === E KEY ACTION HANDLER ===
        // Detect E key press (edge-triggered, not hold) with cooldown
        // Blocked during animations to prevent double-triggers
        const eKeyDown = currentKeys && currentKeys.has("e");
        if (eKeyDown && !eKeyWasDown && !isAnimationPlaying()) {
          const actionNow = performance.now();
          if (actionNow - lastEKeyAction > E_KEY_COOLDOWN) {
            // Find nearest interactable using current robot position
            const currentMatch = scoringEngineRef.current.getState();
            const nearest = findNearestInteractable(pos, missionDefs, currentMatch);
            if (nearest) {
              const stageToAnimate = nearest.stagesCompleted; // 0-indexed
              // Play animation first, then score
              lastEKeyAction = actionNow;
              playMissionAnimation(
                nearest.missionId,
                stageToAnimate,
                renderedMissions,
                scene
              ).then(() => {
                // Score after animation completes
                scoringEngineRef.current.triggerMissionAction(nearest.missionId);
                // Force immediate state update
                lastStateUpdate = 0;
              });
            }
          }
        }
        eKeyWasDown = !!eKeyDown;

        // Camera stays centered on the mat (no follow) so the full field is always visible
        // Users can still orbit/zoom manually

        scene.render();

        // Throttle React state updates to ~5Hz using wall clock
        const now = performance.now();
        if (now - lastStateUpdate > STATE_UPDATE_INTERVAL) {
          lastStateUpdate = now;
          const heading = quaternionToHeadingDeg(rot);
          const vel = robotRigidBody.linvel();
          const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);

          // Proximity detection: find nearest Category B mission within trigger range
          const nearestInteractable = findNearestInteractable(
            pos, missionDefs, scoringEngineRef.current.getState()
          );

          // Update mission label colors based on completion status
          const currentMatchState = scoringEngineRef.current.getState();
          updateMissionLabelColors(renderedMissions, currentMatchState.missions);

          setSceneState({
            fps: Math.round(engine!.getFps()),
            physicsStep: physicsStepRef.current,
            robot: {
              position: {
                x: +pos.x.toFixed(3),
                y: +pos.y.toFixed(3),
                z: +pos.z.toFixed(3),
              },
              heading: +heading.toFixed(1),
              speed: +speed.toFixed(3),
            },
            isReady: true,
            keysPressed: new Set(keysRef.current),
            missionCount: renderedMissions.length,
            season: "SUBMERGED 2024-25",
            match: scoringEngineRef.current.getState(),
            nearestInteractable,
          });
        }
      });

      resizeHandler = () => engine?.resize();
      window.addEventListener("resize", resizeHandler);

      setSceneState((prev) => ({ ...prev, isReady: true }));
    }

    function cleanup() {
      disposedRef.current = true;

      // Stop render loop first
      if (engine) {
        engine.stopRenderLoop();
      }

      // Remove event listeners
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (onKeyDown) window.removeEventListener("keydown", onKeyDown, true);
      if (onKeyUp) window.removeEventListener("keyup", onKeyUp, true);

      // Dispose mission label GUI overlay
      disposeMissionLabelsGUI();

      // Dispose Babylon scene (disposes all meshes, materials, textures)
      if (scene) {
        scene.dispose();
        scene = null;
        sceneRef.current = null;
      }

      // Dispose engine (releases WebGL context)
      if (engine) {
        engine.dispose();
        engine = null;
        engineRef.current = null;
      }

      // Free Rapier WASM memory
      if (world) {
        world.free();
        world = null;
        rapierWorldRef.current = null;
      }

      robotBodyRef.current = null;
      robotMeshRef.current = null;
      missionsRef.current = [];
      keysRef.current.clear();
    }

    init();

    return cleanup;
  }, []);

  return { canvasRef, sceneState, resetScene, startMatch, stopMatch, resetMatch };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// CDN URL for the official SUBMERGED 2024-25 field mat texture
const FIELD_MAT_TEXTURE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663316655797/mCLtYWVwwnd2N8V3jdbdkB/submerged_field_mat_ae7117f2.jpg";

function createFieldMaterial(scene: Scene): StandardMaterial {
  const mat = new StandardMaterial("fieldMat", scene);

  // Load the official SUBMERGED field mat image as the texture
  const tex = new Texture(FIELD_MAT_TEXTURE_URL, scene, false, false);
  // Flip horizontally (uScale = -1) so text reads correctly:
  // "FIRST LEGO LEAGUE CHALLENGE" on bottom-left, "SUBMERGED" on bottom-right.
  // Rotate 180° (wAng) so launch areas face the camera (-Z = bottom of screen).
  tex.wAng = Math.PI;
  tex.uScale = -1;
  tex.vScale = 1;

  mat.diffuseTexture = tex;
  mat.specularColor = new Color3(0.08, 0.08, 0.08); // low specular for mat-like surface
  mat.emissiveColor = new Color3(0.05, 0.05, 0.05); // slight emissive so mat is visible in shadows
  return mat;
}

function createWalls(scene: Scene, world: RAPIER.World, shadowGen: ShadowGenerator) {
  const wallMat = new StandardMaterial("wallMat", scene);
  wallMat.diffuseColor = new Color3(0.2, 0.22, 0.28);
  wallMat.specularColor = new Color3(0.1, 0.1, 0.12);

  // Home area extends 0.35m beyond the mat on each side
  const HOME_WIDTH = 0.35;
  const totalWidth = FIELD_WIDTH + HOME_WIDTH * 2;
  const walls = [
    // Back wall (top of screen, +Z)
    { name: "wallN", w: totalWidth + WALL_THICKNESS * 2, d: WALL_THICKNESS, px: 0, pz: FIELD_DEPTH / 2 + WALL_THICKNESS / 2 },
    // Front wall (bottom of screen, -Z) — open for launch areas, but we still need containment
    { name: "wallS", w: totalWidth + WALL_THICKNESS * 2, d: WALL_THICKNESS, px: 0, pz: -FIELD_DEPTH / 2 - WALL_THICKNESS / 2 },
    // Right wall (beyond right home area)
    { name: "wallE", w: WALL_THICKNESS, d: FIELD_DEPTH, px: FIELD_WIDTH / 2 + HOME_WIDTH + WALL_THICKNESS / 2, pz: 0 },
    // Left wall (beyond left home area)
    { name: "wallW", w: WALL_THICKNESS, d: FIELD_DEPTH, px: -FIELD_WIDTH / 2 - HOME_WIDTH - WALL_THICKNESS / 2, pz: 0 },
  ];

  walls.forEach(({ name, w, d, px, pz }) => {
    const mesh = MeshBuilder.CreateBox(name, { width: w, height: WALL_HEIGHT, depth: d }, scene);
    mesh.material = wallMat;
    mesh.position.set(px, WALL_HEIGHT / 2, pz);
    mesh.receiveShadows = true;
    shadowGen.addShadowCaster(mesh);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(px, WALL_HEIGHT / 2, pz);
    const body = world.createRigidBody(bodyDesc);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(w / 2, WALL_HEIGHT / 2, d / 2).setFriction(0.5).setRestitution(0.3),
      body
    );
  });
}

/**
 * Create visible overlays for Home Areas and Launch Areas.
 *
 * FIELD LAYOUT (top-down view, matching screen orientation):
 * - Field: 2.362m (W) x 1.143m (D)
 * - Front of field (launch areas, player side) = -Z = BOTTOM of screen
 * - Back of field (far missions) = +Z = TOP of screen
 * - Two Home Areas: table extensions on left (-X) and right (+X) sides
 * - Two Launch Areas: quarter-circle arcs at front-left and front-right corners (-Z side)
 *
 * Home area width: ~0.35m on each side
 * Launch area arc radius: ~0.30m (quarter circle, 90°)
 */
function createLaunchAreaOverlay(scene: Scene) {
  const halfW = FIELD_WIDTH / 2;
  const halfD = FIELD_DEPTH / 2;
  const homeWidth = 0.35; // width of home area strip on each side
  const lineHeight = 0.003;
  const lineThick = 0.004;

  // Home area boundary line material (yellow)
  const homeMat = new StandardMaterial("homeLineMat", scene);
  homeMat.diffuseColor = new Color3(1.0, 0.85, 0.2);
  homeMat.emissiveColor = new Color3(0.7, 0.6, 0.1);
  homeMat.alpha = 0.7;

  // --- HOME AREA table extensions (white/beige surfaces beyond the mat) ---
  const homeAreaMat = new StandardMaterial("homeAreaMat", scene);
  homeAreaMat.diffuseColor = new Color3(0.92, 0.90, 0.85); // off-white/beige
  homeAreaMat.specularColor = new Color3(0.1, 0.1, 0.1);

  // Left home area surface
  const leftHome = MeshBuilder.CreateGround("leftHomeArea", {
    width: homeWidth, height: FIELD_DEPTH,
  }, scene);
  leftHome.material = homeAreaMat;
  leftHome.position.set(-halfW - homeWidth / 2, 0.002, 0);
  leftHome.receiveShadows = true;

  // Right home area surface
  const rightHome = MeshBuilder.CreateGround("rightHomeArea", {
    width: homeWidth, height: FIELD_DEPTH,
  }, scene);
  rightHome.material = homeAreaMat;
  rightHome.position.set(halfW + homeWidth / 2, 0.002, 0);
  rightHome.receiveShadows = true;

  // --- HOME AREA boundary lines (yellow) at the inner edge ---
  const leftHomeLine = MeshBuilder.CreateBox("homeLineL", {
    width: lineThick, height: lineHeight, depth: FIELD_DEPTH,
  }, scene);
  leftHomeLine.material = homeMat;
  leftHomeLine.position.set(-halfW, lineHeight, 0);

  const rightHomeLine = MeshBuilder.CreateBox("homeLineR", {
    width: lineThick, height: lineHeight, depth: FIELD_DEPTH,
  }, scene);
  rightHomeLine.material = homeMat;
  rightHomeLine.position.set(halfW, lineHeight, 0);

  // Launch area arcs are already printed on the mat texture, no overlay needed.

  // --- LABELS (home areas only) ---
  createAreaLabel(scene, "LEFT HOME", -halfW - homeWidth / 2, 0.10, 0, new Color3(0.7, 0.6, 0.1));
  createAreaLabel(scene, "RIGHT HOME", halfW + homeWidth / 2, 0.10, 0, new Color3(0.7, 0.6, 0.1));
}

/** Draw a quarter-circle arc as a series of small box segments */
function createQuarterArc(
  scene: Scene, mat: StandardMaterial,
  cornerX: number, cornerZ: number, radius: number,
  startAngle: number, endAngle: number, segments: number, namePrefix: string
) {
  const segThick = 0.004;
  const segHeight = 0.003;

  for (let i = 0; i < segments; i++) {
    const a1 = startAngle + (endAngle - startAngle) * (i / segments);
    const a2 = startAngle + (endAngle - startAngle) * ((i + 1) / segments);
    const x1 = cornerX + Math.cos(a1) * radius;
    const z1 = cornerZ + Math.sin(a1) * radius; // +sin to curve inward from front edge
    const x2 = cornerX + Math.cos(a2) * radius;
    const z2 = cornerZ + Math.sin(a2) * radius;
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const segLen = Math.sqrt(dx * dx + dz * dz) + 0.001;
    const angle = Math.atan2(dx, dz);

    const seg = MeshBuilder.CreateBox(`${namePrefix}_${i}`, {
      width: segLen, height: segHeight, depth: segThick,
    }, scene);
    seg.material = mat;
    seg.position.set(mx, segHeight, mz);
    seg.rotation.y = -angle;
  }
}

/** Create a floating billboard label for an area */
function createAreaLabel(
  scene: Scene, text: string, x: number, y: number, z: number, emissive: Color3
) {
  const plane = MeshBuilder.CreatePlane(`label_${text}`, { width: 0.12, height: 0.02 }, scene);
  const mat = new StandardMaterial(`labelMat_${text}`, scene);
  const tex = new DynamicTexture(`labelTex_${text}`, { width: 256, height: 48 }, scene, false);
  tex.hasAlpha = true;
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 256, 48);
  ctx.font = "bold 22px monospace";
  ctx.fillStyle = `rgb(${Math.round(emissive.r * 255)},${Math.round(emissive.g * 255)},${Math.round(emissive.b * 255)})`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 24);
  tex.update();
  mat.diffuseTexture = tex;
  mat.opacityTexture = tex;
  mat.emissiveColor = emissive;
  mat.backFaceCulling = false;
  plane.material = mat;
  plane.position.set(x, y, z);
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
}

function createRobot(
  scene: Scene,
  world: RAPIER.World,
  shadowGen: ShadowGenerator
): { robotNode: TransformNode; robotRigidBody: RAPIER.RigidBody } {
  const robotNode = new TransformNode("robot", scene);

  // Main body (chassis)
  const chassis = MeshBuilder.CreateBox(
    "chassis",
    { width: ROBOT_WIDTH, height: ROBOT_HEIGHT * 0.6, depth: ROBOT_LENGTH },
    scene
  );
  const chassisMat = new StandardMaterial("chassisMat", scene);
  chassisMat.diffuseColor = new Color3(0.9, 0.9, 0.9);
  chassisMat.specularColor = new Color3(0.3, 0.3, 0.3);
  chassis.material = chassisMat;
  chassis.parent = robotNode;
  chassis.position.y = 0;
  shadowGen.addShadowCaster(chassis);

  // Top hub (the SPIKE Prime brain)
  const hub = MeshBuilder.CreateBox(
    "hub",
    { width: ROBOT_WIDTH * 0.6, height: ROBOT_HEIGHT * 0.35, depth: ROBOT_LENGTH * 0.5 },
    scene
  );
  const hubMat = new StandardMaterial("hubMat", scene);
  hubMat.diffuseColor = new Color3(1.0, 0.85, 0.0);
  hubMat.specularColor = new Color3(0.4, 0.4, 0.3);
  hubMat.emissiveColor = new Color3(0.15, 0.12, 0.0);
  hub.material = hubMat;
  hub.parent = robotNode;
  hub.position.y = ROBOT_HEIGHT * 0.6 * 0.5 + ROBOT_HEIGHT * 0.35 * 0.5 - 0.005;
  hub.position.z = -ROBOT_LENGTH * 0.1;
  shadowGen.addShadowCaster(hub);

  // Screen on hub (dark rectangle)
  const screen = MeshBuilder.CreatePlane("screen", { width: ROBOT_WIDTH * 0.35, height: ROBOT_HEIGHT * 0.15 }, scene);
  const screenMat = new StandardMaterial("screenMat", scene);
  screenMat.diffuseColor = new Color3(0.1, 0.12, 0.15);
  screenMat.emissiveColor = new Color3(0.02, 0.05, 0.08);
  screen.material = screenMat;
  screen.parent = hub;
  screen.position.y = ROBOT_HEIGHT * 0.35 * 0.5 + 0.001;
  screen.position.z = -ROBOT_LENGTH * 0.05;
  screen.rotation.x = Math.PI / 2;

  // Wheels
  const wheelMat = new StandardMaterial("wheelMat", scene);
  wheelMat.diffuseColor = new Color3(0.15, 0.15, 0.15);
  wheelMat.specularColor = new Color3(0.05, 0.05, 0.05);

  const wheelTireMat = new StandardMaterial("wheelTireMat", scene);
  wheelTireMat.diffuseColor = new Color3(0.08, 0.08, 0.08);

  [
    { name: "wheelL", x: -(AXLE_HALF_WIDTH + WHEEL_WIDTH / 2) },
    { name: "wheelR", x: AXLE_HALF_WIDTH + WHEEL_WIDTH / 2 },
  ].forEach(({ name, x }) => {
    const wheel = MeshBuilder.CreateCylinder(
      name,
      { diameter: WHEEL_RADIUS * 2, height: WHEEL_WIDTH, tessellation: 16 },
      scene
    );
    wheel.material = wheelMat;
    wheel.parent = robotNode;
    wheel.position.set(x, -(ROBOT_HEIGHT * 0.6 * 0.5) + WHEEL_RADIUS, -ROBOT_LENGTH * 0.15);
    wheel.rotation.z = Math.PI / 2;
    shadowGen.addShadowCaster(wheel);

    // Tire tread
    const tread = MeshBuilder.CreateTorus(name + "Tread", {
      diameter: WHEEL_RADIUS * 2,
      thickness: 0.004,
      tessellation: 16,
    }, scene);
    tread.material = wheelTireMat;
    tread.parent = wheel;
  });

  // Caster wheel (back)
  const caster = MeshBuilder.CreateSphere("caster", { diameter: WHEEL_RADIUS * 0.8, segments: 8 }, scene);
  caster.material = wheelMat;
  caster.parent = robotNode;
  caster.position.y = -(ROBOT_HEIGHT * 0.6 * 0.5) + WHEEL_RADIUS * 0.4;
  caster.position.z = ROBOT_LENGTH * 0.4;

  // Front direction indicator
  const frontIndicator = MeshBuilder.CreateCylinder(
    "frontIndicator",
    { diameterTop: 0, diameterBottom: 0.02, height: 0.018, tessellation: 4 },
    scene
  );
  const indicatorMat = new StandardMaterial("indicatorMat", scene);
  indicatorMat.diffuseColor = new Color3(0.0, 0.83, 1.0);
  indicatorMat.emissiveColor = new Color3(0.0, 0.3, 0.4);
  frontIndicator.material = indicatorMat;
  frontIndicator.parent = robotNode;
  frontIndicator.position.z = -ROBOT_LENGTH / 2 - 0.005;
  frontIndicator.position.y = 0;
  frontIndicator.rotation.x = -Math.PI / 2;

  // Snap point indicators
  const snapMat = new StandardMaterial("snapMat", scene);
  snapMat.diffuseColor = new Color3(0.0, 0.6, 0.8);
  snapMat.emissiveColor = new Color3(0.0, 0.15, 0.2);
  snapMat.alpha = 0.5;

  const snapPoints = [
    { name: "snap_front", pos: new Vector3(0, ROBOT_HEIGHT * 0.3, -ROBOT_LENGTH / 2) },
    { name: "snap_left", pos: new Vector3(-ROBOT_WIDTH / 2, ROBOT_HEIGHT * 0.3, 0) },
    { name: "snap_right", pos: new Vector3(ROBOT_WIDTH / 2, ROBOT_HEIGHT * 0.3, 0) },
    { name: "snap_top", pos: new Vector3(0, ROBOT_HEIGHT * 0.6, 0) },
  ];

  snapPoints.forEach((sp) => {
    const dot = MeshBuilder.CreateSphere(sp.name, { diameter: 0.008, segments: 6 }, scene);
    dot.material = snapMat;
    dot.parent = robotNode;
    dot.position = sp.pos;
  });

  // === PHYSICS BODY ===
  // Inside the Left Launch Area arc (front-left corner of field)
  // Front of field = -Z (bottom of screen), Left = -X
  const startX = -FIELD_WIDTH / 2 + 0.12;
  const startZ = -(FIELD_DEPTH / 2 - 0.12);
  const startY = ROBOT_HEIGHT / 2 + 0.005;

  const robotDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(startX, startY, startZ)
    .setLinearDamping(0.0)
    .setAngularDamping(0.0)
    .setCcdEnabled(true);
  const robotRigidBody = world.createRigidBody(robotDesc);

  world.createCollider(
    RAPIER.ColliderDesc.cuboid(ROBOT_WIDTH / 2, ROBOT_HEIGHT / 2, ROBOT_LENGTH / 2)
      .setMass(ROBOT_MASS)
      .setFriction(0.6)
      .setRestitution(0.1),
    robotRigidBody
  );

  robotRigidBody.setEnabledRotations(false, true, false, true);

  return { robotNode, robotRigidBody };
}

// Pre-allocated RAPIER vectors for applyRobotControls to avoid per-frame allocations
const _rapierLinvel = { x: 0, y: 0, z: 0 };
const _rapierAngvel = { x: 0, y: 0, z: 0 };

function applyRobotControls(
  robotBody: RAPIER.RigidBody,
  keys: Set<string>
) {
  let forward = 0;
  let turn = 0;

  if (keys.has("w") || keys.has("arrowup")) forward -= 1;
  if (keys.has("s") || keys.has("arrowdown")) forward += 1;
  if (keys.has("a") || keys.has("arrowleft")) turn -= 1;
  if (keys.has("d") || keys.has("arrowright")) turn += 1;

  // Get current rotation to determine forward direction
  const rot = robotBody.rotation();
  const q = Quaternion.FromArray([rot.x, rot.y, rot.z, rot.w]);
  _tmpForward.set(0, 0, -1);
  _tmpForward.rotateByQuaternionToRef(q, _tmpVec3);

  const currentY = robotBody.linvel().y;
  if (forward !== 0) {
    robotBody.setLinvel(
      new RAPIER.Vector3(_tmpVec3.x * forward * MAX_SPEED, currentY, _tmpVec3.z * forward * MAX_SPEED),
      true
    );
  } else {
    robotBody.setLinvel(new RAPIER.Vector3(0, currentY, 0), true);
  }

  if (turn !== 0) {
    robotBody.setAngvel(new RAPIER.Vector3(0, turn * TURN_SPEED, 0), true);
  } else {
    robotBody.setAngvel(new RAPIER.Vector3(0, 0, 0), true);
  }
}

function quaternionToHeadingDeg(q: { x: number; y: number; z: number; w: number }): number {
  const siny_cosp = 2 * (q.w * q.y + q.x * q.z);
  const cosy_cosp = 1 - 2 * (q.y * q.y + q.x * q.x);
  const heading = Math.atan2(siny_cosp, cosy_cosp);
  return ((heading * 180) / Math.PI + 360) % 360;
}

/**
 * Find the nearest Category B (trigger) mission within its trigger radius.
 * Returns null if no interactable mission is in range.
 */
function findNearestInteractable(
  robotPos: { x: number; y: number; z: number },
  missionDefs: MissionDefinition[],
  matchState: MatchState
): NearestInteractable | null {
  let nearest: NearestInteractable | null = null;
  let nearestDist = Infinity;

  for (const def of missionDefs) {
    // Only Category B missions are interactable
    if (def.interactionType !== "trigger") continue;

    const radius = def.triggerRadius ?? 0.15;
    const dx = robotPos.x - def.position.x;
    const dz = robotPos.z - def.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < radius && dist < nearestDist) {
      // Count completed stages from match state
      const matchMission = matchState.missions.find((m) => m.missionId === def.id);
      const stagesCompleted = matchMission
        ? matchMission.conditions.filter((c) => c.completed).length
        : 0;
      const stagesTotal = def.stages ?? 1;

      // Don't show prompt if all stages are already completed
      if (stagesCompleted >= stagesTotal) continue;

      nearestDist = dist;
      nearest = {
        missionId: def.id,
        missionName: def.name,
        distance: +dist.toFixed(3),
        stagesCompleted,
        stagesTotal,
      };
    }
  }

  return nearest;
}
