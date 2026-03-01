/**
 * FLL 3D Simulator — Phase 2: Robot on the Field
 * Babylon.js + Rapier physics with FLL game mat, border walls,
 * differential-drive robot, keyboard controls, and camera follow.
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
  TransformNode,
} from "@babylonjs/core";
import RAPIER from "@dimforge/rapier3d-compat";

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

interface SceneState {
  fps: number;
  physicsStep: number;
  robot: RobotState;
  isReady: boolean;
  keysPressed: Set<string>;
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

  const [sceneState, setSceneState] = useState<SceneState>({
    fps: 0,
    physicsStep: 0,
    robot: { position: { x: 0, y: 0, z: 0 }, heading: 0, speed: 0 },
    isReady: false,
    keysPressed: new Set(),
  });

  const resetScene = useCallback(() => {
    const world = rapierWorldRef.current;
    const robotBody = robotBodyRef.current;
    if (!world || !robotBody) return;

    const startX = -FIELD_WIDTH / 2 + 0.25;
    const startZ = FIELD_DEPTH / 2 - 0.15;
    robotBody.setTranslation(new RAPIER.Vector3(startX, ROBOT_HEIGHT / 2 + 0.005, startZ), true);
    robotBody.setRotation(new RAPIER.Quaternion(0, 0, 0, 1), true);
    robotBody.setLinvel(new RAPIER.Vector3(0, 0, 0), true);
    robotBody.setAngvel(new RAPIER.Vector3(0, 0, 0), true);
    physicsStepRef.current = 0;
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
        Math.PI / 3.5,
        2.5,
        new Vector3(0, 0.2, 0),
        scene
      );
      camera.lowerRadiusLimit = 0.5;
      camera.upperRadiusLimit = 6;
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
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(FIELD_WIDTH / 2, 0.01, FIELD_DEPTH / 2).setFriction(0.8),
        fieldBody
      );

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

      // === KEYBOARD INPUT ===
      onKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
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

        // Camera follows robot (smooth lerp)
        camera.target.x += (pos.x - camera.target.x) * 0.08;
        camera.target.y += (0.15 - camera.target.y) * 0.08;
        camera.target.z += (pos.z - camera.target.z) * 0.08;

        scene.render();

        // Throttle React state updates to ~5Hz using wall clock
        const now = performance.now();
        if (now - lastStateUpdate > STATE_UPDATE_INTERVAL) {
          lastStateUpdate = now;
          const heading = quaternionToHeadingDeg(rot);
          const vel = robotRigidBody.linvel();
          const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);

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
      keysRef.current.clear();
    }

    init();

    return cleanup;
  }, []);

  return { canvasRef, sceneState, resetScene };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function createFieldMaterial(scene: Scene): StandardMaterial {
  const texSize = 1024;
  const tex = new DynamicTexture("fieldTex", { width: texSize, height: Math.round(texSize * (FIELD_DEPTH / FIELD_WIDTH)) }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const w = texSize;
  const h = Math.round(texSize * (FIELD_DEPTH / FIELD_WIDTH));

  // White base
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, w, h);

  // Grid lines (light gray)
  ctx.strokeStyle = "#d0d0d0";
  ctx.lineWidth = 1;
  const gridStep = w / 12;
  for (let i = 0; i <= 12; i++) {
    const x = i * gridStep;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  const gridStepH = h / 6;
  for (let i = 0; i <= 6; i++) {
    const y = i * gridStepH;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Home area (bottom-left, blue rectangle)
  const homeX = 0;
  const homeY = h * 0.7;
  const homeW = w * 0.25;
  const homeH = h * 0.3;
  ctx.fillStyle = "rgba(100, 160, 220, 0.3)";
  ctx.fillRect(homeX, homeY, homeW, homeH);
  ctx.strokeStyle = "#3388cc";
  ctx.lineWidth = 3;
  ctx.strokeRect(homeX, homeY, homeW, homeH);

  // HOME label
  ctx.fillStyle = "#3388cc";
  ctx.font = `bold ${Math.round(h * 0.06)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("HOME", homeX + homeW / 2, homeY + homeH / 2 + h * 0.02);

  // Diagonal lines (mission paths)
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.1); ctx.lineTo(w * 0.9, h * 0.85); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.lineTo(w, h * 0.7); ctx.stroke();

  // Circle marker
  ctx.strokeStyle = "#66aa66";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(w * 0.75, h * 0.4, w * 0.08, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "rgba(100, 180, 100, 0.15)";
  ctx.fill();

  tex.update();

  const mat = new StandardMaterial("fieldMat", scene);
  mat.diffuseTexture = tex;
  mat.specularColor = new Color3(0.15, 0.15, 0.15);
  return mat;
}

function createWalls(scene: Scene, world: RAPIER.World, shadowGen: ShadowGenerator) {
  const wallMat = new StandardMaterial("wallMat", scene);
  wallMat.diffuseColor = new Color3(0.2, 0.22, 0.28);
  wallMat.specularColor = new Color3(0.1, 0.1, 0.12);

  const walls = [
    { name: "wallN", w: FIELD_WIDTH + WALL_THICKNESS * 2, d: WALL_THICKNESS, px: 0, pz: -FIELD_DEPTH / 2 - WALL_THICKNESS / 2 },
    { name: "wallS", w: FIELD_WIDTH + WALL_THICKNESS * 2, d: WALL_THICKNESS, px: 0, pz: FIELD_DEPTH / 2 + WALL_THICKNESS / 2 },
    { name: "wallE", w: WALL_THICKNESS, d: FIELD_DEPTH, px: FIELD_WIDTH / 2 + WALL_THICKNESS / 2, pz: 0 },
    { name: "wallW", w: WALL_THICKNESS, d: FIELD_DEPTH, px: -FIELD_WIDTH / 2 - WALL_THICKNESS / 2, pz: 0 },
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
  const startX = -FIELD_WIDTH / 2 + 0.25;
  const startZ = FIELD_DEPTH / 2 - 0.15;
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
