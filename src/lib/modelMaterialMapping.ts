import type { VehicleMaterialNames } from "./types";

function includesAny(value: string, keywords: string[]) {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function isWheelMaterial(name: string) {
  const normalized = name.toLowerCase();
  return (
    includesAny(normalized, ["wheel", "rim"]) &&
    !includesAny(normalized, ["steering", "steer"])
  );
}

function isBodyPaintMaterial(name: string) {
  const normalized = name.toLowerCase();
  return includesAny(normalized, [
    "body",
    "paint",
    "carpaint",
    "exterior",
    "shell",
    "primary",
  ]);
}

export function detectMaterialMapping(
  materialNames: string[],
): VehicleMaterialNames {
  const uniqueNames = [...new Set(materialNames)].sort((a, b) =>
    a.localeCompare(b),
  );
  const windowMaterial = uniqueNames.find((name) =>
    includesAny(name, ["glass", "window", "windshield", "windscreen"]),
  );
  const wheels = uniqueNames.filter((name) => isWheelMaterial(name));
  const caliper = uniqueNames.find((name) =>
    includesAny(name, ["caliper", "brake"]),
  );
  const excluded = new Set([windowMaterial, caliper, ...wheels].filter(Boolean));
  const bodyPaint = uniqueNames.filter(
    (name) => !excluded.has(name) && isBodyPaintMaterial(name),
  );

  return {
    bodyPaint,
    windows: windowMaterial,
    wheels,
    caliper,
  };
}

export function mergeMaterialMapping(
  saved: VehicleMaterialNames,
  availableMaterials: string[],
): VehicleMaterialNames {
  const detected = detectMaterialMapping(availableMaterials);
  const bodyPaint =
    saved.bodyPaint.length > 0 ? saved.bodyPaint : detected.bodyPaint;
  const bodyPaintSet = new Set(bodyPaint);
  const wheelsFromSaved = saved.wheels.filter(
    (name) => !bodyPaintSet.has(name) && isWheelMaterial(name),
  );

  return {
    bodyPaint,
    wheels: wheelsFromSaved.length > 0 ? wheelsFromSaved : detected.wheels,
    windows: saved.windows ?? detected.windows,
    caliper: saved.caliper ?? detected.caliper,
    bodyPaintNodes: saved.bodyPaintNodes,
    wheelNodes: saved.wheelNodes,
    livery: saved.livery,
  };
}
