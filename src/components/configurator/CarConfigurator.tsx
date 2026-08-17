"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
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
import { LIVERIES } from "@/lib/catalog";
import type { PaintType, VehicleDefinition } from "@/lib/types";

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
    // Keep the wheel's shape/detail maps, but omit the albedo map so the
    // selected swatch can control the visible wheel color.
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
  // The selected finish should not be overridden by source PBR value maps,
  // while the ambient-occlusion map remains useful for spoke depth.
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
  return (
    <div
      id="car-configurator"
      className="h-full w-full min-h-[420px] overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950"
    >
      <Canvas
        camera={{ position: [24, 10, 24], fov: 38 }}
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
          makeDefault
          enablePan={false}
          minDistance={8}
          maxDistance={70}
          maxPolarAngle={Math.PI / 2.05}
        />
        <Suspense fallback={<Loader />}>
          <Bounds key={vehicle.id} fit clip observe margin={1.18}>
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
    </div>
  );
}
