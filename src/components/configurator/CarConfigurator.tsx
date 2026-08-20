"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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
import { soundEffects } from "@/lib/soundEffects";
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
    position: [13.0, 2.2, 1.8],
    target: [6.0, 1.58, 4.15],
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

export interface EnvironmentPreset {
  id: string;
  name: string;
  shortName: string;
  description: string;
  bgColor: string;
  ambientIntensity: number;
  hemisphereColor: string;
  hemisphereGround: string;
  hemisphereIntensity: number;
  dirLight1Pos: [number, number, number];
  dirLight1Intensity: number;
  dirLight1Color: string;
  dirLight2Pos: [number, number, number];
  dirLight2Intensity: number;
  dirLight2Color: string;
  shadowOpacity: number;
  topIntensity: number;
  ringIntensity: number;
  side1Intensity: number;
  side1Color?: string;
  side2Intensity: number;
  side2Color?: string;
}

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  {
    id: "studio",
    name: "极简暗调影棚",
    shortName: "影棚",
    description: "经典深色影棚，突出车身轮廓与金属光泽",
    bgColor: "#09090b",
    ambientIntensity: 0.7,
    hemisphereColor: "#f2f5ff",
    hemisphereGround: "#1a1a1a",
    hemisphereIntensity: 0.45,
    dirLight1Pos: [12, 18, 10],
    dirLight1Intensity: 1.35,
    dirLight1Color: "#ffffff",
    dirLight2Pos: [-8, 6, -6],
    dirLight2Intensity: 0.45,
    dirLight2Color: "#ffffff",
    shadowOpacity: 0.55,
    topIntensity: 1.1,
    ringIntensity: 0.7,
    side1Intensity: 0.55,
    side2Intensity: 0.45,
  },
  {
    id: "cyber",
    name: "赛博霓虹夜景",
    shortName: "赛博",
    description: "青蓝与洋红双色霓虹反光，夜晚街头改装氛围",
    bgColor: "#04060d",
    ambientIntensity: 0.85,
    hemisphereColor: "#00e5ff",
    hemisphereGround: "#d900ff",
    hemisphereIntensity: 0.65,
    dirLight1Pos: [12, 18, 10],
    dirLight1Intensity: 1.5,
    dirLight1Color: "#00e5ff",
    dirLight2Pos: [-10, 8, -8],
    dirLight2Intensity: 1.2,
    dirLight2Color: "#ff007f",
    shadowOpacity: 0.7,
    topIntensity: 1.4,
    ringIntensity: 0.9,
    side1Intensity: 1.2,
    side1Color: "#00e5ff",
    side2Intensity: 1.0,
    side2Color: "#ff007f",
  },
  {
    id: "sunset",
    name: "日落黄金余晖",
    shortName: "日落",
    description: "夕阳低角度侧逆光，暖金光芒烘托车漆质感",
    bgColor: "#0e0906",
    ambientIntensity: 0.8,
    hemisphereColor: "#ff9d00",
    hemisphereGround: "#2a1508",
    hemisphereIntensity: 0.55,
    dirLight1Pos: [20, 9, 14],
    dirLight1Intensity: 1.8,
    dirLight1Color: "#ffaa33",
    dirLight2Pos: [-8, 6, -6],
    dirLight2Intensity: 0.6,
    dirLight2Color: "#9333ea",
    shadowOpacity: 0.6,
    topIntensity: 1.0,
    ringIntensity: 0.8,
    side1Intensity: 1.1,
    side1Color: "#ff8800",
    side2Intensity: 0.6,
    side2Color: "#a855f7",
  },
  {
    id: "track",
    name: "户外赛道天光",
    shortName: "赛道",
    description: "高对比度自然日光天光，还原真实户外日光表现",
    bgColor: "#090d14",
    ambientIntensity: 1.1,
    hemisphereColor: "#e0f2fe",
    hemisphereGround: "#334155",
    hemisphereIntensity: 0.75,
    dirLight1Pos: [8, 26, 6],
    dirLight1Intensity: 2.1,
    dirLight1Color: "#fffbf0",
    dirLight2Pos: [-12, 10, -10],
    dirLight2Intensity: 0.75,
    dirLight2Color: "#93c5fd",
    shadowOpacity: 0.65,
    topIntensity: 1.6,
    ringIntensity: 0.9,
    side1Intensity: 0.8,
    side1Color: "#ffffff",
    side2Intensity: 0.7,
    side2Color: "#bae6fd",
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
const VEHICLE_TARGET_SIZE = 20;

function createBodyMaterial(source: THREE.MeshStandardMaterial) {
  return new THREE.MeshPhysicalMaterial({
    name: source.name,
    color: "#ffffff",
    map: source.map,
    normalMap: source.normalMap,
    normalScale: source.normalScale?.clone?.() ?? new THREE.Vector2(1, 1),
    aoMap: source.aoMap,
    aoMapIntensity: source.aoMapIntensity ?? 1.0,
    side: source.side,
    transparent: source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
    depthTest: source.depthTest,
    depthWrite: source.depthWrite,
    vertexColors: source.vertexColors,
    flatShading: false,
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

function createTireMaterial(source: THREE.MeshStandardMaterial) {
  return new THREE.MeshStandardMaterial({
    name: source.name,
    color: "#18191b",
    map: source.map,
    normalMap: source.normalMap,
    normalScale: source.normalScale?.clone?.() ?? new THREE.Vector2(1, 1),
    roughness: 0.88,
    metalness: 0.04,
    side: source.side,
  });
}

function applyTireFinish(material: THREE.MeshStandardMaterial) {
  material.color.set("#18191b");
  material.roughness = 0.88;
  material.metalness = 0.04;
  material.envMapIntensity = 0.35;
}

function createWheelMaterial(source: THREE.MeshStandardMaterial) {
  return new THREE.MeshPhysicalMaterial({
    name: source.name,
    color: source.color.clone(),
    map: source.map,
    normalMap: source.normalMap,
    normalScale: source.normalScale?.clone?.() ?? new THREE.Vector2(1, 1),
    aoMap: source.aoMap,
    aoMapIntensity: source.aoMapIntensity ?? 1.0,
    side: source.side,
    transparent: source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
    depthTest: source.depthTest,
    depthWrite: source.depthWrite,
    vertexColors: source.vertexColors,
    flatShading: false,
    metalness: 0.85,
    roughness: 0.26,
    clearcoat: 0.4,
    clearcoatRoughness: 0.18,
    envMapIntensity: 0.85,
  });
}

function applyLightFinish(
  material: THREE.MeshStandardMaterial,
  color: string,
  intensity: number,
) {
  material.emissive.set(color);
  material.emissiveIntensity = intensity;
  material.toneMapped = false;
  material.needsUpdate = true;
}

function applyPaintFinish(
  material: THREE.MeshPhysicalMaterial,
  color: string,
  paintType: PaintType,
) {
  material.color.set(color);
  material.flatShading = false;

  if (paintType === "metallic") {
    material.metalness = 0.65;
    material.roughness = 0.22;
    material.clearcoat = 1.0;
    material.clearcoatRoughness = 0.06;
    material.ior = 1.5;
    material.envMapIntensity = 0.9;
  } else if (paintType === "matte") {
    material.metalness = 0.1;
    material.roughness = 0.62;
    material.clearcoat = 0;
    material.clearcoatRoughness = 0.7;
    material.ior = 1.45;
    material.envMapIntensity = 0.45;
  } else if (paintType === "wrap") {
    material.metalness = 0.2;
    material.roughness = 0.38;
    material.clearcoat = 0.35;
    material.clearcoatRoughness = 0.2;
    material.ior = 1.48;
    material.envMapIntensity = 0.75;
  } else {
    // "solid"
    material.metalness = 0.05;
    material.roughness = 0.24;
    material.clearcoat = 0.85;
    material.clearcoatRoughness = 0.08;
    material.ior = 1.5;
    material.envMapIntensity = 0.85;
  }
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
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
  color: string,
) {
  material.color.set(color);
  material.metalness = 0.88;
  material.roughness = 0.24;
  material.envMapIntensity = 0.85;
  if (material instanceof THREE.MeshPhysicalMaterial) {
    material.clearcoat = 0.45;
    material.clearcoatRoughness = 0.15;
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
    scene.updateWorldMatrix(true, true);
    const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
    const longestSide = Math.max(size.x, size.y, size.z);
    return longestSide > 0 ? VEHICLE_TARGET_SIZE / longestSide : 1;
  }, [scene]);

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

        const isTire =
          vehicle.materialNames.tires?.includes(material.name) &&
          material instanceof THREE.MeshStandardMaterial;

        if (isTire) {
          const tireMaterial = createTireMaterial(material);
          ownedMaterials.push(tireMaterial);
          return tireMaterial;
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

      if (!child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals();
      }
      child.material = isMaterialArray ? materials : materials[0];
      const isLight = materials.some((material) =>
        Boolean(vehicle.materialNames.lights?.[material.name]),
      );
      child.castShadow = !isLight;
      child.receiveShadow = !isLight;
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
        const light = vehicle.materialNames.lights?.[material.name];
        if (light && material instanceof THREE.MeshStandardMaterial) {
          applyLightFinish(material, light.color, light.intensity);
          continue;
        }

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
          vehicle.materialNames.tires?.includes(material.name) &&
          material instanceof THREE.MeshStandardMaterial
        ) {
          applyTireFinish(material);
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
    <group rotation={vehicle.rotation ?? [0, Math.PI / 7, 0]}>
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
            style={{ width: Math.max(6, progress) + "%" }}
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
  const [isStockPreview, setIsStockPreview] = useState<boolean>(false);
  const [activeEnvId, setActiveEnvId] = useState<string>("studio");
  const isMuted = useSyncExternalStore(
    (cb) => soundEffects.subscribe(cb),
    () => soundEffects.isMuted(),
    () => false,
  );

  const activeEnv = useMemo(() => {
    return (
      ENVIRONMENT_PRESETS.find((e) => e.id === activeEnvId) ??
      ENVIRONMENT_PRESETS[0]
    );
  }, [activeEnvId]);

  const handleSelectPreset = useCallback((id: string) => {
    soundEffects.playCameraSwoosh();
    setActivePresetId(id);
    setTargetRequest({ presetId: id, requestId: Date.now() });
  }, []);

  const handleSelectEnv = useCallback((id: string) => {
    soundEffects.playToggleClick();
    setActiveEnvId(id);
  }, []);

  const handleToggleComparison = useCallback((stock: boolean) => {
    soundEffects.playToggleClick();
    setIsStockPreview(stock);
  }, []);

  const handleToggleMute = useCallback(() => {
    soundEffects.toggleMuted();
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
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleToggleComparison(!isStockPreview);
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        const currentIndex = ENVIRONMENT_PRESETS.findIndex((env) => env.id === activeEnvId);
        const nextEnv = ENVIRONMENT_PRESETS[(currentIndex + 1) % ENVIRONMENT_PRESETS.length];
        if (nextEnv) handleSelectEnv(nextEnv.id);
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        handleToggleMute();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeEnvId, handleSelectEnv, handleSelectPreset, handleToggleComparison, handleToggleMute, isStockPreview]);

  return (
    <div
      id="car-configurator"
      className="relative h-full w-full min-h-[420px] overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950"
    >
      <Canvas
        camera={{ position: [24, 10, 24], fov: 38, near: 0.1, far: 250 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
          antialias: true,
        }}
        shadows={{ type: THREE.PCFSoftShadowMap }}
      >
        <color attach="background" args={[activeEnv.bgColor]} />
        <ambientLight intensity={activeEnv.ambientIntensity} />
        <hemisphereLight
          intensity={activeEnv.hemisphereIntensity}
          color={activeEnv.hemisphereColor}
          groundColor={activeEnv.hemisphereGround}
        />
        <directionalLight
          position={activeEnv.dirLight1Pos}
          intensity={activeEnv.dirLight1Intensity}
          color={activeEnv.dirLight1Color}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
          shadow-normalBias={0.02}
          shadow-camera-near={1}
          shadow-camera-far={60}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <directionalLight
          position={activeEnv.dirLight2Pos}
          intensity={activeEnv.dirLight2Intensity}
          color={activeEnv.dirLight2Color}
        />
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
                color={isStockPreview ? "#f2f2f2" : color}
                paintType={isStockPreview ? "solid" : paintType}
                liveryId={isStockPreview ? "none" : liveryId}
                wheelColor={isStockPreview ? "#b8bcc2" : wheelColor}
                caliperColor={isStockPreview ? "#18191b" : caliperColor}
                onMaterialsDiscovered={onMaterialsDiscovered}
              />
            </Center>
          </Bounds>
          <ContactShadows
            position={[0, 0, 0]}
            opacity={activeEnv.shadowOpacity}
            scale={28}
            blur={3.5}
            far={12}
            frames={1}
          />
        </Suspense>
        <Environment resolution={512}>
          <Lightformer
            form="ring"
            intensity={activeEnv.topIntensity * 0.85}
            position={[0, 16, 0]}
            rotation-x={Math.PI / 2}
            scale={[24, 24]}
          />
          <Lightformer
            form="ring"
            intensity={activeEnv.ringIntensity * 0.6}
            position={[0, 8, 0]}
            scale={16}
          />
          <Lightformer
            form="circle"
            color={activeEnv.side1Color}
            intensity={activeEnv.side1Intensity * 0.75}
            position={[-14, 5, 6]}
            rotation-y={Math.PI / 2}
            scale={[12, 12]}
          />
          <Lightformer
            form="circle"
            color={activeEnv.side2Color}
            intensity={activeEnv.side2Intensity * 0.75}
            position={[14, 5, -6]}
            rotation-y={-Math.PI / 2}
            scale={[12, 12]}
          />
        </Environment>
      </Canvas>

      {/* Before / After Comparison Toggle */} 
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/75 p-1 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => handleToggleComparison(false)}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              !isStockPreview
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                : "text-zinc-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <span>改装方案</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleComparison(true)}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              isStockPreview
                ? "bg-amber-600 text-white shadow-md shadow-amber-500/25"
                : "text-zinc-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <span>原厂状态</span>
            <span className={clsx("text-[10px]", isStockPreview ? "text-amber-200" : "text-zinc-500")}>
              OEM
            </span>
          </button>
        </div>

        {isStockPreview && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-black/80 px-3 py-1.5 text-xs text-amber-300 shadow-xl backdrop-blur-md animate-in fade-in duration-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>当前展示出厂原厂状态 (按 C 切回改装)</span>
          </div>
        )}
      </div>

      {/* Floating Bottom Controls HUD: Camera Presets + Environment Lighting + Mute */} 
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Camera Presets */} 
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
                title={preset.name + " (按键 " + preset.shortcut + ") · " + preset.description}
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

        {/* Right: Environment Lighting & Sound Toggle */} 
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Environment Presets */} 
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/75 p-1.5 shadow-2xl backdrop-blur-md">
            <span className="hidden px-2 text-[11px] font-medium text-zinc-400 md:inline-block">
              光照
            </span>
            {ENVIRONMENT_PRESETS.map((env) => {
              const isEnvActive = activeEnvId === env.id;
              return (
                <button
                  key={env.id}
                  type="button"
                  onClick={() => handleSelectEnv(env.id)}
                  title={env.name + " · " + env.description}
                  className={clsx(
                    "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                    isEnvActive
                      ? "bg-zinc-100 text-zinc-950 font-semibold shadow-md"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {env.shortName}
                </button>
              );
            })}
          </div>

          {/* Mute Audio Toggle */} 
          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted ? "取消静音 (按键 M)" : "静音 (按键 M)"}
            className={clsx(
              "flex items-center justify-center rounded-xl border border-white/10 bg-black/75 p-2.5 shadow-2xl backdrop-blur-md transition",
              isMuted ? "text-zinc-500 hover:text-zinc-300" : "text-blue-400 hover:text-blue-300",
            )}
          >
            {isMuted ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
