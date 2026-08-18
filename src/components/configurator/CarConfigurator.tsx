"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Bounds,
  Center,
  ContactShadows,
  Environment,
  Html,
  Lightformer,
  OrbitControls,
  useGLTF,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import clsx from "clsx";
import { LIVERIES } from "@/lib/catalog";
import type { PaintType, VehicleDefinition } from "@/lib/types";

export interface CameraPreset {
  id: string;
  name: string;
  shortName: string;
  shortcut: string;
  description: string;
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: "front-34",
    name: "前 45° 全景",
    shortName: "前45°",
    shortcut: "1",
    description: "经典全景视角，兼顾前脸与侧身线条",
    position: [24, 10, 24],
    target: [0, 1.0, 0],
  },
  {
    id: "side",
    name: "正侧面视",
    shortName: "正侧",
    shortcut: "2",
    description: "水平侧身视角，观察车身贴膜与轮毂姿态",
    position: [-14, 5, 28],
    target: [0, 1.0, 0],
  },
  {
    id: "front",
    name: "正前脸",
    shortName: "正前",
    shortcut: "3",
    description: "正前方低角度，观察进气格栅与前唇机盖",
    position: [28, 4.5, 10],
    target: [0, 0.9, 0],
  },
  {
    id: "rear-34",
    name: "后 45° 视角",
    shortName: "后45°",
    shortcut: "4",
    description: "斜后方视角，观察尾翼、排气与后扩散器",
    position: [-22, 8, -22],
    target: [0, 1.0, 0],
  },
  {
    id: "wheel",
    name: "轮毂特写",
    shortName: "轮毂",
    shortcut: "5",
    description: "特写前轮毂造型、刹车卡钳及轮胎细节",
    position: [12, 2.8, 12],
    target: [2.8, 0.7, 1.8],
  },
  {
    id: "top",
    name: "车顶俯视",
    shortName: "俯视",
    shortcut: "6",
    description: "垂直俯瞰全车，观察车顶贴膜与全景天窗",
    position: [0.5, 34, 1],
    target: [0, 0.5, 0],
  },
];

interface CarModelProps {
  vehicle: VehicleDefinition;
  color: string;
  paintType: PaintType;
  liveryId: string;
  wheelColor: string;
  caliperColor: string;
  onMaterialsDiscovered?: (materialNames: string[]) => void;
}

interface LiveryMaterialState {
  originalMap: THREE.Texture | null;
  originalColor: THREE.Color;
  originalMetalness: number;
  originalRoughness: number;
  originalEnvMapIntensity: number;
}

const liveryMaterialStates = new WeakMap<
  THREE.MeshPhysicalMaterial,
  LiveryMaterialState
>();
const CUSTOM_MODEL_TARGET_SIZE = 20;

function createBodyMaterial(source: THREE.MeshStandardMaterial) {
  return new THREE.MeshPhysicalMaterial({
    name: source.name,
    color: "#ffffff",
    side: source.side,
    transparent: source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
    depthTest: source.depthTest,
    depthWrite: source.depthWrite,
    vertexColors: source.vertexColors,
    flatShading: source.flatShading,
  });
}

function createWindowMaterial(source: THREE.MeshStandardMaterial) {
  return new THREE.MeshPhysicalMaterial({
    name: source.name,
    color: "#0b1420",
    side: source.side,
    transparent: false,
    opacity: 1,
    alphaTest: source.alphaTest,
    depthTest: source.depthTest,
    depthWrite: true,
    vertexColors: source.vertexColors,
    flatShading: source.flatShading,
    metalness: 0.45,
    roughness: 0.18,
    clearcoat: 0.7,
    clearcoatRoughness: 0.16,
    envMapIntensity: 0.7,
  });
}

function createWheelMaterial(source: THREE.MeshStandardMaterial) {
  return new THREE.MeshPhysicalMaterial({
    name: source.name,
    color: source.color.clone(),
    normalMap: source.normalMap,
    normalScale: source.normalScale?.clone?.() ?? new THREE.Vector2(1, 1),
    aoMap: source.aoMap,
    aoMapIntensity: source.aoMapIntensity,
    metalnessMap: source.metalnessMap,
    roughnessMap: source.roughnessMap,
    side: source.side,
    transparent: source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
    depthTest: source.depthTest,
    depthWrite: source.depthWrite,
    vertexColors: source.vertexColors,
    flatShading: false,
    metalness: 0.62,
    roughness: 0.34,
    clearcoat: 0.4,
    clearcoatRoughness: 0.22,
    envMapIntensity: 0.55,
  });
}

function applyPaintFinish(
  material: THREE.MeshPhysicalMaterial,
  color: string,
  paintType: PaintType,
) {
  material.color.set(color);
  material.metalness = paintType === "metallic" ? 0.55 : 0.06;
  material.roughness =
    paintType === "matte"
      ? 0.72
      : paintType === "wrap"
        ? 0.48
        : paintType === "solid"
          ? 0.28
          : 0.22;
  material.clearcoat =
    paintType === "matte" ? 0.06 : paintType === "wrap" ? 0.22 : 0.55;
  material.clearcoatRoughness =
    paintType === "matte" ? 0.7 : paintType === "wrap" ? 0.4 : 0.18;
  material.envMapIntensity = paintType === "matte" ? 0.45 : 0.7;
}

function applyWindowFinish(material: THREE.MeshPhysicalMaterial) {
  material.color.set("#0b1420");
  material.metalness = 0.45;
  material.roughness = 0.18;
  material.clearcoat = 0.7;
  material.clearcoatRoughness = 0.16;
  material.envMapIntensity = 0.7;
}

function applyWheelFinish(
  material: THREE.MeshStandardMaterial,
  color: string,
) {
  material.color.set(color);
  if (material.metalnessMap || material.roughnessMap) {
    material.metalnessMap = null;
    material.roughnessMap = null;
    material.needsUpdate = true;
  }
  material.metalness = 0.62;
  material.roughness = 0.34;
  material.envMapIntensity = 0.55;
  if (material instanceof THREE.MeshPhysicalMaterial) {
    material.clearcoat = 0.4;
    material.clearcoatRoughness = 0.22;
  }
}

function applyCaliperFinish(
  material: THREE.MeshStandardMaterial,
  color: string,
) {
  material.color.set(color);
  material.metalness = 0.22;
  material.roughness = 0.48;
  material.envMapIntensity = 0.45;
}

function CarModel({
  vehicle,
  color,
  paintType,
  liveryId,
  wheelColor,
  caliperColor,
  onMaterialsDiscovered,
}: CarModelProps) {
  const { scene } = useGLTF(vehicle.modelPath);
  const invalidate = useThree((state) => state.invalidate);

  const modelScale = useMemo(() => {
    if (!vehicle.isCustom) return 1;

    scene.updateWorldMatrix(true, true);
    const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
    const longestSide = Math.max(size.x, size.y, size.z);
    return longestSide > 0 ? CUSTOM_MODEL_TARGET_SIZE / longestSide : 1;
  }, [scene, vehicle.isCustom]);

  const materialNames = useMemo(() => {
    const names = new Set<string>();
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const material of materials) names.add(material.name);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [scene]);

  useEffect(() => {
    onMaterialsDiscovered?.(materialNames);
  }, [materialNames, onMaterialsDiscovered]);

  const cloned = useMemo(() => {
    const object = scene.clone(true);
    const ownedMaterials: THREE.Material[] = [];

    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const isMaterialArray = Array.isArray(child.material);
      const sourceMaterials: THREE.Material[] = isMaterialArray
        ? child.material
        : [child.material];
      const materials = sourceMaterials.map((material) => {
        const isBodyPaint =
          vehicle.materialNames.bodyPaint.includes(material.name) ||
          vehicle.materialNames.bodyPaintNodes?.includes(child.name);
        const isWindow =
          vehicle.materialNames.windows === material.name &&
          material instanceof THREE.MeshStandardMaterial;
        const isLivery =
          vehicle.materialNames.livery === material.name &&
          material instanceof THREE.MeshStandardMaterial;
        const isWheel =
          vehicle.materialNames.wheels.includes(material.name) &&
          (!vehicle.materialNames.wheelNodes ||
            vehicle.materialNames.wheelNodes.includes(child.name)) &&
          material instanceof THREE.MeshStandardMaterial;

        if (isWindow) {
          const windowMaterial = createWindowMaterial(material);
          ownedMaterials.push(windowMaterial);
          return windowMaterial;
        }

        if (isLivery) {
          const liveryMaterial = createBodyMaterial(material);

          ownedMaterials.push(liveryMaterial);
          liveryMaterialStates.set(liveryMaterial, {
            originalMap: material.map,
            originalColor: material.color.clone(),
            originalMetalness: material.metalness,
            originalRoughness: material.roughness,
            originalEnvMapIntensity: material.envMapIntensity,
          });
          return liveryMaterial;
        }

        if (isWheel) {
          const wheelMaterial = createWheelMaterial(material);
          ownedMaterials.push(wheelMaterial);
          return wheelMaterial;
        }

        const clonedMaterial =
          isBodyPaint && material instanceof THREE.MeshStandardMaterial
            ? createBodyMaterial(material)
            : material.clone();

        ownedMaterials.push(clonedMaterial);
        return clonedMaterial;
      });

      child.material = isMaterialArray ? materials : materials[0];
      child.castShadow = true;
      child.receiveShadow = true;
    });

    return { object, ownedMaterials };
  }, [scene, vehicle]);

  useEffect(
    () => () => {
      cloned.ownedMaterials.forEach((material) => material.dispose());
    },
    [cloned],
  );

  useLayoutEffect(() => {
    const livery = LIVERIES.find((item) => item.id === liveryId) ?? LIVERIES[0];

    cloned.object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      for (const material of materials) {
        if (
          vehicle.materialNames.windows === material.name &&
          material instanceof THREE.MeshPhysicalMaterial
        ) {
          applyWindowFinish(material);
          continue;
        }

        if (
          vehicle.materialNames.livery === material.name &&
          material instanceof THREE.MeshPhysicalMaterial
        ) {
          const state = liveryMaterialStates.get(material);
          if (!state) continue;

          if (livery.visible) {
            if (material.map !== state.originalMap) {
              material.map = state.originalMap;
              material.needsUpdate = true;
            }
            material.color.copy(state.originalColor);
            material.color.multiply(new THREE.Color(livery.tint));
            material.metalness = state.originalMetalness;
            material.roughness = state.originalRoughness;
            material.clearcoat = 0;
            material.clearcoatRoughness = 0;
            material.envMapIntensity = state.originalEnvMapIntensity;
          } else {
            if (material.map) {
              material.map = null;
              material.needsUpdate = true;
            }
            applyPaintFinish(material, color, paintType);
          }
          continue;
        }

        if (
          (vehicle.materialNames.bodyPaint.includes(material.name) ||
            vehicle.materialNames.bodyPaintNodes?.includes(child.name)) &&
          material instanceof THREE.MeshPhysicalMaterial
        ) {
          applyPaintFinish(material, color, paintType);
          continue;
        }

        if (
          vehicle.materialNames.wheels.includes(material.name) &&
          (!vehicle.materialNames.wheelNodes ||
            vehicle.materialNames.wheelNodes.includes(child.name)) &&
          material instanceof THREE.MeshStandardMaterial
        ) {
          applyWheelFinish(material, wheelColor);
          continue;
        }

        if (
          material.name === vehicle.materialNames.caliper &&
          material instanceof THREE.MeshStandardMaterial
        ) {
          applyCaliperFinish(material, caliperColor);
          continue;
        }
      }
    });
    invalidate();
  }, [
    caliperColor,
    cloned,
    color,
    invalidate,
    liveryId,
    paintType,
    vehicle,
    wheelColor,
  ]);

  return (
    <group rotation={[0, Math.PI / 7, 0]}>
      <group scale={modelScale}>
        <primitive object={cloned.object} />
      </group>
    </group>
  );
}

function Loader() {
  const { progress } = useProgress();

  return (
    <Html center>
      <div className="w-56 rounded-xl border border-white/10 bg-black/70 p-4 text-center backdrop-blur">
        <p className="text-sm font-medium text-zinc-200">加载车辆模型</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-[width] duration-200"
            style={{ width: `${Math.max(6, progress)}%` }}
          />
        </div>
        <p className="mt-2 text-xs tabular-nums text-zinc-500">
          {Math.round(progress)}%
        </p>
      </div>
    </Html>
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface CameraTargetRequest {
  presetId: string;
  requestId: number;
}

interface CameraControllerProps {
  target: CameraTargetRequest | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onUserInteraction?: () => void;
  onTransitionEnd?: () => void;
}

function CameraController({
  target,
  controlsRef,
  onUserInteraction,
  onTransitionEnd,
}: CameraControllerProps) {
  const { camera, invalidate } = useThree();
  const animRef = useRef<{
    isAnimating: boolean;
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    destPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    destTarget: THREE.Vector3;
  }>({
    isAnimating: false,
    startTime: 0,
    duration: 850,
    startPos: new THREE.Vector3(),
    destPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    destTarget: new THREE.Vector3(),
  });

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleStart = () => {
      if (animRef.current.isAnimating) {
        animRef.current.isAnimating = false;
      }
      onUserInteraction?.();
    };

    controls.addEventListener("start", handleStart);
    return () => {
      controls.removeEventListener("start", handleStart);
    };
  }, [controlsRef, onUserInteraction]);

  useEffect(() => {
    if (!target) return;
    const preset = CAMERA_PRESETS.find((p) => p.id === target.presetId);
    if (!preset) return;

    const controls = controlsRef.current;
    const currentTarget = controls
      ? controls.target.clone()
      : new THREE.Vector3(0, 1.0, 0);

    animRef.current = {
      isAnimating: true,
      startTime: performance.now(),
      duration: 850,
      startPos: camera.position.clone(),
      destPos: new THREE.Vector3(...preset.position),
      startTarget: currentTarget,
      destTarget: new THREE.Vector3(...preset.target),
    };
    invalidate();
  }, [target, camera, controlsRef, invalidate]);

  useFrame(() => {
    if (!animRef.current.isAnimating) return;

    const { startTime, duration, startPos, destPos, startTarget, destTarget } =
      animRef.current;
    const elapsed = performance.now() - startTime;
    const progress = Math.min(1, Math.max(0, elapsed / duration));
    const t = easeInOutCubic(progress);

    camera.position.lerpVectors(startPos, destPos, t);

    const controls = controlsRef.current;
    if (controls) {
      controls.target.lerpVectors(startTarget, destTarget, t);
      controls.update();
    }

    invalidate();

    if (progress >= 1) {
      animRef.current.isAnimating = false;
      onTransitionEnd?.();
    }
  });

  return null;
}

interface CarConfiguratorProps {
  vehicle: VehicleDefinition;
  color: string;
  paintType: PaintType;
  liveryId: string;
  wheelColor: string;
  caliperColor: string;
  onMaterialsDiscovered?: (materialNames: string[]) => void;
}

export default function CarConfigurator({
  vehicle,
  color,
  paintType,
  liveryId,
  wheelColor,
  caliperColor,
  onMaterialsDiscovered,
}: CarConfiguratorProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>("front-34");
  const [targetRequest, setTargetRequest] = useState<CameraTargetRequest | null>(null);

  const handleSelectPreset = useCallback((id: string) => {
    setActivePresetId(id);
    setTargetRequest({ presetId: id, requestId: Date.now() });
  }, []);

  const handleUserInteraction = useCallback(() => {
    setActivePresetId(null);
  }, []);

  const prevVehicleIdRef = useRef(vehicle.id);
  useEffect(() => {
    if (prevVehicleIdRef.current !== vehicle.id) {
      prevVehicleIdRef.current = vehicle.id;
      handleSelectPreset("front-34");
    }
  }, [vehicle.id, handleSelectPreset]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const found = CAMERA_PRESETS.find((p) => p.shortcut === e.key);
      if (found) {
        e.preventDefault();
        handleSelectPreset(found.id);
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleSelectPreset("front-34");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSelectPreset]);

  return (
    <div
      id="car-configurator"
      className="relative h-full w-full min-h-[420px] overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950"
    >
      <Canvas
        camera={{ position: [24, 10, 24], fov: 38, near: 0.1, far: 250 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ powerPreference: "high-performance", preserveDrawingBuffer: true }}
        shadows="basic"
      >
        <color attach="background" args={["#0a0a0a"]} />
        <ambientLight intensity={0.7} />
        <hemisphereLight intensity={0.45} color="#f2f5ff" groundColor="#1a1a1a" />
        <directionalLight position={[12, 18, 10]} intensity={1.35} castShadow />
        <directionalLight position={[-8, 6, -6]} intensity={0.45} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enablePan={false}
          target={[0, 1.0, 0]}
          minDistance={8}
          maxDistance={70}
          maxPolarAngle={Math.PI / 2.05}
        />
        <CameraController
          target={targetRequest}
          controlsRef={controlsRef}
          onUserInteraction={handleUserInteraction}
        />
        <Suspense fallback={<Loader />}>
          <Bounds key={vehicle.id} clip observe margin={1.18}>
            <Center top>
              <CarModel
                vehicle={vehicle}
                color={color}
                paintType={paintType}
                liveryId={liveryId}
                wheelColor={wheelColor}
                caliperColor={caliperColor}
                onMaterialsDiscovered={onMaterialsDiscovered}
              />
            </Center>
          </Bounds>
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.55}
            scale={28}
            blur={3.5}
            far={12}
            frames={1}
          />
        </Suspense>
        <Environment resolution={512}>
          <Lightformer
            form="rect"
            intensity={1.1}
            position={[0, 14, 0]}
            rotation-x={Math.PI / 2}
            scale={[20, 14]}
          />
          <Lightformer
            form="ring"
            intensity={0.7}
            position={[0, 6, 0]}
            scale={14}
          />
          <Lightformer
            form="rect"
            intensity={0.55}
            position={[-12, 3, 4]}
            rotation-y={Math.PI / 2}
            scale={[10, 8]}
          />
          <Lightformer
            form="rect"
            intensity={0.45}
            position={[12, 3, -4]}
            rotation-y={-Math.PI / 2}
            scale={[10, 8]}
          />
        </Environment>
      </Canvas>

      {/* Floating Camera Presets Bar */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-black/75 p-1.5 shadow-2xl backdrop-blur-md">
          <span className="hidden px-2 text-[11px] font-medium text-zinc-400 sm:inline-block">
            机位
          </span>
          {CAMERA_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                title={`${preset.name} (按键 ${preset.shortcut}) · ${preset.description}`}
                className={clsx(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <span>{preset.shortName}</span>
                <span
                  className={clsx(
                    "hidden text-[10px] sm:inline-block",
                    isActive ? "text-blue-200" : "text-zinc-500",
                  )}
                >
                  {preset.shortcut}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pointer-events-auto hidden items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-400 backdrop-blur-md md:flex">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span>拖拽自由旋转 · 按 1-6 / R 切视角</span>
        </div>
      </div>
    </div>
  );
}
