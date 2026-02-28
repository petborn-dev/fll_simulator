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
} from "@babylonjs/core";
import RAPIER from "@dimforge/rapier3d-compat";

interface PhysicsBody {
  mesh: Mesh;
  rigidBody: RAPIER.RigidBody;
}

interface SceneState {
  fps: number;
  physicsStep: number;
  boxPosition: { x: number; y: number; z: number };
  isReady: boolean;
}

export function useBabylonScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const rapierWorldRef = useRef<RAPIER.World | null>(null);
  const bodiesRef = useRef<PhysicsBody[]>([]);
  const physicsStepRef = useRef(0);
  const [sceneState, setSceneState] = useState<SceneState>({
    fps: 0,
    physicsStep: 0,
    boxPosition: { x: 0, y: 10, z: 0 },
    isReady: false,
  });

  const resetScene = useCallback(() => {
    const world = rapierWorldRef.current;
    if (!world) return;

    // Remove all existing bodies
    bodiesRef.current.forEach(({ rigidBody }) => {
      world.removeRigidBody(rigidBody);
    });
    bodiesRef.current = [];
    physicsStepRef.current = 0;

    // Re-create ground
    const groundDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0);
    const groundBody = world.createRigidBody(groundDesc);
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(25, 0.25, 25);
    world.createCollider(groundColliderDesc, groundBody);

    // Re-create falling box
    const boxDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 10, 0)
      .setLinearDamping(0.1);
    const boxBody = world.createRigidBody(boxDesc);
    const boxColliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
      .setRestitution(0.3)
      .setFriction(0.8);
    world.createCollider(boxColliderDesc, boxBody);

    // Find existing meshes
    const scene = sceneRef.current;
    if (scene) {
      const boxMesh = scene.getMeshByName("fallingBox") as Mesh;
      if (boxMesh) {
        boxMesh.position.set(0, 10, 0);
        bodiesRef.current.push({ mesh: boxMesh, rigidBody: boxBody });
      }
    }

    // Create additional falling objects for visual interest
    const scene2 = sceneRef.current;
    if (scene2) {
      // Remove old extra boxes
      scene2.meshes
        .filter((m) => m.name.startsWith("extraBox_"))
        .forEach((m) => m.dispose());

      const colors = [
        new Color3(0.0, 0.83, 1.0),  // cyan
        new Color3(1.0, 0.72, 0.0),  // amber
        new Color3(0.4, 0.9, 0.5),   // green
        new Color3(0.9, 0.3, 0.4),   // red
        new Color3(0.7, 0.5, 1.0),   // purple
      ];

      for (let i = 0; i < 5; i++) {
        const size = 0.3 + Math.random() * 0.5;
        const x = (Math.random() - 0.5) * 6;
        const y = 12 + Math.random() * 8;
        const z = (Math.random() - 0.5) * 6;

        const extraBox = MeshBuilder.CreateBox(
          `extraBox_${i}`,
          { size: size * 2 },
          scene2
        );
        const mat = new StandardMaterial(`extraBoxMat_${i}`, scene2);
        mat.diffuseColor = colors[i % colors.length];
        mat.specularColor = new Color3(0.3, 0.3, 0.3);
        extraBox.material = mat;
        extraBox.position.set(x, y, z);

        const extraDesc = RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(x, y, z)
          .setLinearDamping(0.1);
        const extraBody = world.createRigidBody(extraDesc);
        const extraCollider = RAPIER.ColliderDesc.cuboid(size, size, size)
          .setRestitution(0.4)
          .setFriction(0.6);
        world.createCollider(extraCollider, extraBody);

        // Add shadow
        const shadowGen = scene2.metadata?.shadowGenerator as ShadowGenerator | undefined;
        if (shadowGen) {
          shadowGen.addShadowCaster(extraBox);
        }

        bodiesRef.current.push({ mesh: extraBox, rigidBody: extraBody });
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;

    async function init() {
      // Initialize Rapier
      await RAPIER.init();

      if (disposed) return;

      // Create Babylon engine
      const engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
      });
      engineRef.current = engine;

      // Create scene
      const scene = new Scene(engine);
      sceneRef.current = scene;
      scene.clearColor = new Color4(0.04, 0.05, 0.08, 1);
      scene.ambientColor = new Color3(0.1, 0.1, 0.15);
      scene.fogMode = Scene.FOGMODE_EXP2;
      scene.fogDensity = 0.008;
      scene.fogColor = new Color3(0.04, 0.05, 0.08);

      // Camera
      const camera = new ArcRotateCamera(
        "camera",
        -Math.PI / 4,
        Math.PI / 3.5,
        25,
        new Vector3(0, 2, 0),
        scene
      );
      camera.lowerRadiusLimit = 5;
      camera.upperRadiusLimit = 60;
      camera.lowerBetaLimit = 0.1;
      camera.upperBetaLimit = Math.PI / 2.1;
      camera.wheelDeltaPercentage = 0.01;
      camera.attachControl(canvas, true);

      // Hemisphere light (ambient)
      const hemiLight = new HemisphericLight(
        "hemiLight",
        new Vector3(0, 1, 0),
        scene
      );
      hemiLight.intensity = 0.4;
      hemiLight.diffuse = new Color3(0.6, 0.65, 0.8);
      hemiLight.groundColor = new Color3(0.1, 0.1, 0.15);

      // Directional light (sun) with shadows
      const dirLight = new DirectionalLight(
        "dirLight",
        new Vector3(-1, -2, -1).normalize(),
        scene
      );
      dirLight.intensity = 0.8;
      dirLight.diffuse = new Color3(0.9, 0.85, 0.75);
      dirLight.position = new Vector3(10, 20, 10);

      // Shadow generator
      const shadowGenerator = new ShadowGenerator(2048, dirLight);
      shadowGenerator.useBlurExponentialShadowMap = true;
      shadowGenerator.blurKernel = 32;
      shadowGenerator.darkness = 0.4;
      scene.metadata = { shadowGenerator };

      // Ground plane
      const ground = MeshBuilder.CreateGround(
        "ground",
        { width: 50, height: 50, subdivisions: 2 },
        scene
      );
      const groundMat = new StandardMaterial("groundMat", scene);
      groundMat.diffuseColor = new Color3(0.08, 0.09, 0.12);
      groundMat.specularColor = new Color3(0.05, 0.05, 0.08);
      ground.material = groundMat;
      ground.receiveShadows = true;

      // Grid lines on ground
      const gridSize = 50;
      const gridStep = 2;
      for (let i = -gridSize / 2; i <= gridSize / 2; i += gridStep) {
        const lineX = MeshBuilder.CreateLines(
          `gridX_${i}`,
          {
            points: [
              new Vector3(i, 0.01, -gridSize / 2),
              new Vector3(i, 0.01, gridSize / 2),
            ],
          },
          scene
        );
        lineX.color = new Color3(0.15, 0.18, 0.25);
        lineX.alpha = 0.3;

        const lineZ = MeshBuilder.CreateLines(
          `gridZ_${i}`,
          {
            points: [
              new Vector3(-gridSize / 2, 0.01, i),
              new Vector3(gridSize / 2, 0.01, i),
            ],
          },
          scene
        );
        lineZ.color = new Color3(0.15, 0.18, 0.25);
        lineZ.alpha = 0.3;
      }

      // Main falling box
      const box = MeshBuilder.CreateBox(
        "fallingBox",
        { size: 1 },
        scene
      );
      const boxMat = new StandardMaterial("boxMat", scene);
      boxMat.diffuseColor = new Color3(0.0, 0.83, 1.0);
      boxMat.specularColor = new Color3(0.5, 0.5, 0.5);
      boxMat.emissiveColor = new Color3(0.0, 0.15, 0.2);
      box.material = boxMat;
      box.position.y = 10;
      shadowGenerator.addShadowCaster(box);

      // Create Rapier world
      const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
      const world = new RAPIER.World(gravity);
      rapierWorldRef.current = world;

      // Ground physics body
      const groundDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0);
      const groundBody = world.createRigidBody(groundDesc);
      const groundColliderDesc = RAPIER.ColliderDesc.cuboid(25, 0.25, 25);
      world.createCollider(groundColliderDesc, groundBody);

      // Box physics body
      const boxDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 10, 0)
        .setLinearDamping(0.1);
      const boxBody = world.createRigidBody(boxDesc);
      const boxColliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
        .setRestitution(0.3)
        .setFriction(0.8);
      world.createCollider(boxColliderDesc, boxBody);

      bodiesRef.current.push({ mesh: box, rigidBody: boxBody });

      // Add extra falling objects
      const colors = [
        new Color3(1.0, 0.72, 0.0),
        new Color3(0.4, 0.9, 0.5),
        new Color3(0.9, 0.3, 0.4),
        new Color3(0.7, 0.5, 1.0),
        new Color3(0.0, 0.83, 1.0),
      ];

      for (let i = 0; i < 5; i++) {
        const size = 0.3 + Math.random() * 0.5;
        const x = (Math.random() - 0.5) * 6;
        const y = 12 + Math.random() * 8;
        const z = (Math.random() - 0.5) * 6;

        const extraBox = MeshBuilder.CreateBox(
          `extraBox_${i}`,
          { size: size * 2 },
          scene
        );
        const mat = new StandardMaterial(`extraBoxMat_${i}`, scene);
        mat.diffuseColor = colors[i];
        mat.specularColor = new Color3(0.3, 0.3, 0.3);
        mat.emissiveColor = colors[i].scale(0.15);
        extraBox.material = mat;
        extraBox.position.set(x, y, z);
        shadowGenerator.addShadowCaster(extraBox);

        const extraDesc = RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(x, y, z)
          .setLinearDamping(0.1);
        const extraBody = world.createRigidBody(extraDesc);
        const extraCollider = RAPIER.ColliderDesc.cuboid(size, size, size)
          .setRestitution(0.4)
          .setFriction(0.6);
        world.createCollider(extraCollider, extraBody);

        bodiesRef.current.push({ mesh: extraBox, rigidBody: extraBody });
      }

      // Render loop
      let frameCount = 0;
      engine.runRenderLoop(() => {
        // Step physics
        world.step();
        physicsStepRef.current++;

        // Sync Babylon meshes with Rapier bodies
        bodiesRef.current.forEach(({ mesh, rigidBody }) => {
          const pos = rigidBody.translation();
          const rot = rigidBody.rotation();
          mesh.position.set(pos.x, pos.y, pos.z);
          mesh.rotationQuaternion = new Quaternion(rot.x, rot.y, rot.z, rot.w);
        });

        scene.render();

        // Update state every 10 frames for performance
        frameCount++;
        if (frameCount % 10 === 0) {
          const mainBox = bodiesRef.current[0];
          const pos = mainBox?.rigidBody.translation();
          setSceneState({
            fps: Math.round(engine.getFps()),
            physicsStep: physicsStepRef.current,
            boxPosition: pos
              ? { x: +pos.x.toFixed(2), y: +pos.y.toFixed(2), z: +pos.z.toFixed(2) }
              : { x: 0, y: 0, z: 0 },
            isReady: true,
          });
        }
      });

      // Handle resize
      const resizeHandler = () => engine.resize();
      window.addEventListener("resize", resizeHandler);

      setSceneState((prev) => ({ ...prev, isReady: true }));

      return () => {
        window.removeEventListener("resize", resizeHandler);
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
      bodiesRef.current = [];
    };
  }, []);

  return { canvasRef, sceneState, resetScene };
}
