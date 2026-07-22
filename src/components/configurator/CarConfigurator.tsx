"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
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
import { DEFAULT_VEHICLE, LIVERIES } from "@/lib/catalog";
import type { PaintType } from "@/lib/types";

interface CarModelProps {
  color: string;
  paintType: PaintType;
  liveryId: string;
  wheelColor: string;
  caliperColor: string;
}

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

function CarModel({
  color,
  paintType,
  liveryId,
  wheelColor,
  caliperColor,
}: CarModelProps) {
  const { scene } = useGLTF(DEFAULT_VEHICLE.modelPath);

  const cloned = useMemo(() => {
    const object = scene.clone(true);
    const ownedMaterials: THREE.Material[] = [];

    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const cloneMaterial = (material: THREE.Material) => {
        const clonedMaterial =
          DEFAULT_VEHICLE.materialNames.bodyPaint.includes(material.name) &&
          material instanceof THREE.MeshStandardMaterial
            ? createBodyMaterial(material)
            : material.clone();

        ownedMaterials.push(clonedMaterial);
        return clonedMaterial;
      };

      child.material = Array.isArray(child.material)
        ? child.material.map(cloneMaterial)
        : cloneMaterial(child.material);
      child.castShadow = true;
      child.receiveShadow = true;
    });

    return { object, ownedMaterials };
  }, [scene]);

  useEffect(
    () => () => {
      cloned.ownedMaterials.forEach((material) => material.dispose());
    },
    [cloned],
  );

  useEffect(() => {
    const livery = LIVERIES.find((item) => item.id === liveryId) ?? LIVERIES[0];

    cloned.object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      for (const material of materials) {
        if (
          DEFAULT_VEHICLE.materialNames.bodyPaint.includes(material.name) &&
          material instanceof THREE.MeshPhysicalMaterial
        ) {
          material.color.set(color);
          material.metalness = paintType === "metallic" ? 0.72 : 0.08;
          material.roughness =
            paintType === "matte"
              ? 0.72
              : paintType === "wrap"
                ? 0.48
                : paintType === "solid"
                  ? 0.24
                  : 0.18;
          material.clearcoat =
            paintType === "matte" ? 0.08 : paintType === "wrap" ? 0.28 : 1;
          material.clearcoatRoughness =
            paintType === "matte" ? 0.7 : paintType === "wrap" ? 0.38 : 0.08;
          material.envMapIntensity = paintType === "matte" ? 0.65 : 1.2;
          continue;
        }

        if (
          DEFAULT_VEHICLE.materialNames.wheels.includes(material.name) &&
          material instanceof THREE.MeshStandardMaterial
        ) {
          if (material.map) {
            material.map = null;
            material.needsUpdate = true;
          }
          material.color.set(wheelColor);
          material.metalness = 0.9;
          material.roughness = 0.24;
          continue;
        }

        if (
          material.name === DEFAULT_VEHICLE.materialNames.caliper &&
          material instanceof THREE.MeshStandardMaterial
        ) {
          material.color.set(caliperColor);
          material.metalness = 0.35;
          material.roughness = 0.3;
          continue;
        }

        if (
          material.name === DEFAULT_VEHICLE.materialNames.windows &&
          material instanceof THREE.MeshStandardMaterial
        ) {
          material.color.set("#7890a3");
          material.transparent = true;
          material.opacity = 0.38;
          material.metalness = 0;
          material.roughness = 0.08;
          material.depthWrite = false;
          continue;
        }

        if (
          material.name === DEFAULT_VEHICLE.materialNames.livery &&
          material instanceof THREE.MeshStandardMaterial
        ) {
          child.visible = livery.visible;
          material.color.set(livery.tint);
        }
      }
    });
  }, [caliperColor, cloned, color, liveryId, paintType, wheelColor]);

  return (
    <group rotation={[0, Math.PI / 7, 0]}>
      <primitive object={cloned.object} />
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
  color: string;
  paintType: PaintType;
  liveryId: string;
  wheelColor: string;
  caliperColor: string;
}

export default function CarConfigurator({
  color,
  paintType,
  liveryId,
  wheelColor,
  caliperColor,
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
        <ambientLight intensity={0.55} />
        <directionalLight position={[12, 18, 10]} intensity={2.2} castShadow />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={8}
          maxDistance={70}
          maxPolarAngle={Math.PI / 2.05}
        />
        <Suspense fallback={<Loader />}>
          <Bounds fit clip observe margin={1.18}>
            <Center top>
              <CarModel
                color={color}
                paintType={paintType}
                liveryId={liveryId}
                wheelColor={wheelColor}
                caliperColor={caliperColor}
              />
            </Center>
          </Bounds>
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.7}
            scale={28}
            blur={3}
            far={12}
            frames={1}
          />
        </Suspense>
        <Environment resolution={64}>
          <Lightformer
            form="rect"
            intensity={4}
            position={[0, 12, 2]}
            rotation-x={Math.PI / 2}
            scale={[16, 10]}
          />
          <Lightformer
            form="rect"
            intensity={3}
            position={[-10, 4, 2]}
            rotation-y={Math.PI / 2}
            scale={[12, 6]}
          />
          <Lightformer
            form="rect"
            intensity={2.5}
            position={[10, 3, -4]}
            rotation-y={-Math.PI / 2}
            scale={[10, 5]}
          />
        </Environment>
      </Canvas>
    </div>
  );
}
