import type { VehicleMaterialNames } from "./types";

function includesAny(value: string, keywords: string[]) {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function isWheelMaterial(name: string) {
  return (
    includesAny(name, ["wheel", "rim", "alloy", "mag"]) &&
    !includesAny(name, [
      "steering",
      "steer",
      "tire",
      "tyre",
      "rubber",
      "disk",
      "disc",
      "brake",
      "caliper",
    ])
  );
}

function isBodyPaintMaterial(name: string) {
  return includesAny(name, [
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
  const caliper = uniqueNames.find((name) =>
    includesAny(name, ["caliper", "brake"]),
  );

  // Body paint before wheels: "primary" contains substring "rim".
  const bodyPaint = uniqueNames.filter(
    (name) =>
      name !== windowMaterial &&
      name !== caliper &&
      isBodyPaintMaterial(name),
  );
  const bodyPaintSet = new Set(bodyPaint);
  const wheels = uniqueNames.filter(
    (name) =>
      !bodyPaintSet.has(name) &&
      name !== windowMaterial &&
      name !== caliper &&
      isWheelMaterial(name),
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
