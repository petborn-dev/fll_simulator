/**
 * FLL 3D Simulator — Phase 2: Robot on the Field
 * Babylon.js + Rapier physics with FLL game mat, border walls,
 * differential-drive robot, keyboard controls, and camera follow.
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
  Mesh,
  Quaternion,
  DynamicTexture,
  TransformNode,
} from "@babylonjs/core";
import RAPIER from "@dimforge/rapier3d-compat";

// FLL field dimensions in meters (real: 2362mm x 1143mm)
const FIELD_WIDTH = 2.362;
const FIELD_DEPTH = 1.143;
const WALL_HEIGHT = 0.08; // ~80mm border walls
const WALL_THICKNESS = 0.02;

// Robot dimensions (realistic SPIKE Prime compact driving base)
const ROBOT_WIDTH = 0.12;  // 120mm — typical compact FLL base
const ROBOT_LENGTH = 0.15; // 150mm
const ROBOT_HEIGHT = 0.08; // 80mm
const WHEEL_RADIUS = 0.028; // 28mm (56mm diameter — SPIKE Prime large wheel)
const WHEEL_WIDTH = 0.018;
const AXLE_HALF_WIDTH = ROBOT_WIDTH / 2;

// Robot physics
const ROBOT_MASS = 0.8; // ~800g
const MAX_SPEED = 0.8; // m/s
const TURN_SPEED = 4.0; // rad/s
const PHYSICS_DT = 1 / 60; // Fixed physics timestep

interface RobotState {
  position: { x: number; y: number; z: number };
  heading: number; // degrees
  speed: number;
}

interface SceneState {
  fps: number;
  physicsStep: number;
  robot: RobotState;
  isReady: boolean;
  keysPressed: Set<string>;
}

export function useBabylonScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const rapierWorldRef = useRef<RAPIER.World | null>(null);
  const robotBodyRef = useRef<RAPIER.RigidBody | null>(null);
  const robotMeshRef = useRef<TransformNode | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const physicsStepRef = useRef(0);

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

    // Reset robot position to starting area (bottom-left of field)
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

    let disposed = false;

    async function init() {
      await RAPIER.init();
      if (disposed) return;

      // === ENGINE & SCENE ===
      const engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
      });
      engineRef.current = engine;

      const scene = new Scene(engine);
      sceneRef.current = scene;
      scene.clearColor = new Color4(0.04, 0.05, 0.08, 1);
      scene.ambientColor = new Color3(0.15, 0.15, 0.2);

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
      camera.panningSensibility = 0; // disable panning, camera follows robot
      camera.attachControl(canvas, true);
      cameraRef.current = camera;

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

      const shadowGenerator = new ShadowGenerator(1024, dirLight);
      shadowGenerator.useBlurExponentialShadowMap = true;
      shadowGenerator.blurKernel = 16;
      shadowGenerator.darkness = 0.35;

      // === RAPIER WORLD ===
      const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
      const world = new RAPIER.World(gravity);
      world.timestep = PHYSICS_DT;
      rapierWorldRef.current = world;

      // === OUTER GROUND (dark area outside field) ===
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
        { width: FIELD_WIDTH, height: FIELD_DEPTH, subdivisions: 4 },
        scene
      );
      field.material = fieldMat;
      field.position.y = 0.001;
      field.receiveShadows = true;

      // Field physics (static)
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

      // === KEYBOARD INPUT ===
      const onKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
          e.preventDefault();
          keysRef.current.add(key);
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        keysRef.current.delete(e.key.toLowerCase());
      };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      // === RENDER LOOP ===
      let frameCount = 0;
      engine.runRenderLoop(() => {
        // Apply robot controls before each physics step
        applyRobotControls(world, robotRigidBody, keysRef.current);

        // Step physics with fixed timestep
        world.step();
        physicsStepRef.current++;

        // Sync robot mesh with physics
        const pos = robotRigidBody.translation();
        const rot = robotRigidBody.rotation();
        robotNode.position.set(pos.x, pos.y, pos.z);
        robotNode.rotationQuaternion = new Quaternion(rot.x, rot.y, rot.z, rot.w);

        // Camera follows robot
        camera.target.x += (pos.x - camera.target.x) * 0.08;
        camera.target.y += (0.15 - camera.target.y) * 0.08;
        camera.target.z += (pos.z - camera.target.z) * 0.08;

        scene.render();

        // Update React state every 6 frames
        frameCount++;
        if (frameCount % 6 === 0) {
          const q = robotRigidBody.rotation();
          const heading = quaternionToHeadingDeg(q);
          const vel = robotRigidBody.linvel();
          const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);

          setSceneState({
            fps: Math.round(engine.getFps()),
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

      const resizeHandler = () => engine.resize();
      window.addEventListener("resize", resizeHandler);

      setSceneState((prev) => ({ ...prev, isReady: true }));

      return () => {
        window.removeEventListener("resize", resizeHandler);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
      };
    }

    init();

    return () => {
      disposed = true;
      engineRef.current?.dispose();
      sceneRef.current?.dispose();
      rapierWorldRef.current?.free();
      engineRef.current = null;
      sceneRef.current = null;
      rapierWorldRef.current = null;
      robotBodyRef.current = null;
      robotMeshRef.current = null;
    };
  }, []);

  return { canvasRef, sceneState, resetScene };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function createFieldMaterial(scene: Scene): StandardMaterial {
  // Create a dynamic texture for the FLL field mat
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
  ctx.fillStyle = "rgba(0, 100, 200, 0.3)";
  ctx.fillRect(0, h * 0.65, w * 0.2, h * 0.35);
  ctx.strokeStyle = "#0064c8";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, h * 0.65, w * 0.2, h * 0.35);

  // Launch area lines
  ctx.fillStyle = "rgba(0, 100, 200, 0.15)";
  ctx.fillRect(w * 0.2, h * 0.65, w * 0.12, h * 0.35);
  ctx.strokeStyle = "#0064c8";
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.2, h * 0.65, w * 0.12, h * 0.35);

  // Some colored mission zones (simplified representations)
  // Red zone (top-right area)
  ctx.fillStyle = "rgba(220, 50, 50, 0.25)";
  ctx.fillRect(w * 0.7, h * 0.05, w * 0.25, h * 0.25);
  ctx.strokeStyle = "#dc3232";
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.7, h * 0.05, w * 0.25, h * 0.25);

  // Green zone (center)
  ctx.fillStyle = "rgba(50, 180, 50, 0.2)";
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.4, w * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#32b432";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.4, w * 0.08, 0, Math.PI * 2);
  ctx.stroke();

  // Yellow zone (top-left)
  ctx.fillStyle = "rgba(240, 200, 0, 0.25)";
  ctx.fillRect(w * 0.05, h * 0.05, w * 0.2, h * 0.2);
  ctx.strokeStyle = "#f0c800";
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.05, h * 0.05, w * 0.2, h * 0.2);

  // Black lines (mission paths)
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 3;
  // Horizontal line
  ctx.beginPath(); ctx.moveTo(w * 0.15, h * 0.5); ctx.lineTo(w * 0.85, h * 0.5); ctx.stroke();
  // Vertical line
  ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.1); ctx.lineTo(w * 0.5, h * 0.9); ctx.stroke();
  // Diagonal
  ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.2); ctx.lineTo(w * 0.7, h * 0.8); ctx.stroke();

  // "HOME" label
  ctx.fillStyle = "#0050a0";
  ctx.font = `bold ${Math.round(w * 0.025)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("HOME", w * 0.1, h * 0.82);

  // "FLL FIELD" label
  ctx.fillStyle = "#666666";
  ctx.font = `${Math.round(w * 0.018)}px sans-serif`;
  ctx.fillText("FLL CHALLENGE FIELD", w * 0.5, h * 0.97);

  tex.update();

  const mat = new StandardMaterial("fieldMat", scene);
  mat.diffuseTexture = tex;
  mat.specularColor = new Color3(0.15, 0.15, 0.15);
  return mat;
}

function createWalls(scene: Scene, world: RAPIER.World, shadowGen: ShadowGenerator) {
  const wallMat = new StandardMaterial("wallMat", scene);
  wallMat.diffuseColor = new Color3(0.25, 0.25, 0.3);
  wallMat.specularColor = new Color3(0.1, 0.1, 0.1);

  const walls = [
    // North wall (back, -Z)
    { pos: [0, WALL_HEIGHT / 2, -FIELD_DEPTH / 2 - WALL_THICKNESS / 2], size: [FIELD_WIDTH / 2 + WALL_THICKNESS, WALL_HEIGHT / 2, WALL_THICKNESS / 2] },
    // South wall (front, +Z)
    { pos: [0, WALL_HEIGHT / 2, FIELD_DEPTH / 2 + WALL_THICKNESS / 2], size: [FIELD_WIDTH / 2 + WALL_THICKNESS, WALL_HEIGHT / 2, WALL_THICKNESS / 2] },
    // West wall (left, -X)
    { pos: [-FIELD_WIDTH / 2 - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0], size: [WALL_THICKNESS / 2, WALL_HEIGHT / 2, FIELD_DEPTH / 2] },
    // East wall (right, +X)
    { pos: [FIELD_WIDTH / 2 + WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0], size: [WALL_THICKNESS / 2, WALL_HEIGHT / 2, FIELD_DEPTH / 2] },
  ];

  walls.forEach((w, i) => {
    const mesh = MeshBuilder.CreateBox(
      `wall_${i}`,
      { width: w.size[0] * 2, height: w.size[1] * 2, depth: w.size[2] * 2 },
      scene
    );
    mesh.material = wallMat;
    mesh.position.set(w.pos[0], w.pos[1], w.pos[2]);
    mesh.receiveShadows = true;
    shadowGen.addShadowCaster(mesh);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(w.pos[0], w.pos[1], w.pos[2]);
    const body = world.createRigidBody(bodyDesc);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(w.size[0], w.size[1], w.size[2]).setFriction(0.5),
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
  chassisMat.diffuseColor = new Color3(0.9, 0.9, 0.9); // white SPIKE Prime
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
  hubMat.diffuseColor = new Color3(1.0, 0.85, 0.0); // SPIKE Prime yellow
  hubMat.specularColor = new Color3(0.4, 0.4, 0.3);
  hubMat.emissiveColor = new Color3(0.15, 0.12, 0.0);
  hub.material = hubMat;
  hub.parent = robotNode;
  hub.position.y = ROBOT_HEIGHT * 0.6 * 0.5 + ROBOT_HEIGHT * 0.35 * 0.5 - 0.005;
  hub.position.z = -ROBOT_LENGTH * 0.1;
  shadowGen.addShadowCaster(hub);

  // Screen on hub (dark rectangle)
  const screen = MeshBuilder.CreatePlane("screen", { width: ROBOT_WIDTH * 0.35, height: ROBOT_HEIGHT * 0.18 }, scene);
  const screenMat = new StandardMaterial("screenMat", scene);
  screenMat.diffuseColor = new Color3(0.1, 0.1, 0.15);
  screenMat.emissiveColor = new Color3(0.0, 0.05, 0.08);
  screenMat.specularColor = new Color3(0.5, 0.5, 0.5);
  screen.material = screenMat;
  screen.parent = hub;
  screen.position.y = ROBOT_HEIGHT * 0.35 * 0.5 + 0.001;
  screen.rotation.x = Math.PI / 2;

  // Wheels (left and right)
  const wheelMat = new StandardMaterial("wheelMat", scene);
  wheelMat.diffuseColor = new Color3(0.15, 0.15, 0.15);
  wheelMat.specularColor = new Color3(0.05, 0.05, 0.05);

  const wheelTireMat = new StandardMaterial("wheelTireMat", scene);
  wheelTireMat.diffuseColor = new Color3(0.08, 0.08, 0.08);

  [-1, 1].forEach((side) => {
    const wheel = MeshBuilder.CreateCylinder(
      `wheel_${side > 0 ? "R" : "L"}`,
      { diameter: WHEEL_RADIUS * 2, height: WHEEL_WIDTH, tessellation: 16 },
      scene
    );
    wheel.material = wheelMat;
    wheel.parent = robotNode;
    wheel.rotation.z = Math.PI / 2;
    wheel.position.x = side * (AXLE_HALF_WIDTH + WHEEL_WIDTH / 2);
    wheel.position.y = -(ROBOT_HEIGHT * 0.6 * 0.5) + WHEEL_RADIUS;
    wheel.position.z = 0;
    shadowGen.addShadowCaster(wheel);

    // Tire tread ring
    const tread = MeshBuilder.CreateTorus(
      `tread_${side > 0 ? "R" : "L"}`,
      { diameter: WHEEL_RADIUS * 2, thickness: 0.005, tessellation: 16 },
      scene
    );
    tread.material = wheelTireMat;
    tread.parent = wheel;
  });

  // Caster wheel (back)
  const caster = MeshBuilder.CreateSphere("caster", { diameter: WHEEL_RADIUS * 0.8, segments: 8 }, scene);
  caster.material = wheelMat;
  caster.parent = robotNode;
  caster.position.y = -(ROBOT_HEIGHT * 0.6 * 0.5) + WHEEL_RADIUS * 0.4;
  caster.position.z = ROBOT_LENGTH * 0.4;

  // Front direction indicator (small cyan arrow/triangle)
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

  // Snap point indicators (small colored dots showing where attachments can go)
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

  // Main chassis collider
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(ROBOT_WIDTH / 2, ROBOT_HEIGHT / 2, ROBOT_LENGTH / 2)
      .setMass(ROBOT_MASS)
      .setFriction(0.6)
      .setRestitution(0.1),
    robotRigidBody
  );

  // Lock rotation on X and Z axes (robot stays upright)
  robotRigidBody.setEnabledRotations(false, true, false, true);

  return { robotNode, robotRigidBody };
}

function applyRobotControls(
  _world: RAPIER.World,
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
  const q = new Quaternion(rot.x, rot.y, rot.z, rot.w);
  const forwardDir = new Vector3(0, 0, -1);
  const rotatedForward = forwardDir.rotateByQuaternionToRef(q, new Vector3());

  // Directly set velocity every frame (no damping, full manual control)
  const currentY = robotBody.linvel().y; // preserve gravity
  if (forward !== 0) {
    const vel = rotatedForward.scale(forward * MAX_SPEED);
    robotBody.setLinvel(new RAPIER.Vector3(vel.x, currentY, vel.z), true);
  } else {
    // No input: stop immediately (simulates high-friction LEGO wheels)
    robotBody.setLinvel(new RAPIER.Vector3(0, currentY, 0), true);
  }

  // Directly set angular velocity for turning
  if (turn !== 0) {
    robotBody.setAngvel(new RAPIER.Vector3(0, turn * TURN_SPEED, 0), true);
  } else {
    robotBody.setAngvel(new RAPIER.Vector3(0, 0, 0), true);
  }
}

function quaternionToHeadingDeg(q: { x: number; y: number; z: number; w: number }): number {
  // Extract Y-axis rotation (heading) from quaternion
  const siny_cosp = 2 * (q.w * q.y + q.x * q.z);
  const cosy_cosp = 1 - 2 * (q.y * q.y + q.x * q.x);
  const heading = Math.atan2(siny_cosp, cosy_cosp);
  return ((heading * 180) / Math.PI + 360) % 360;
}
