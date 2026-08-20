export type PaintType = "solid" | "metallic" | "matte" | "wrap";

export type Coverage = "full" | "roof" | "hood";

export interface PaintConfig {
  type: PaintType;
  color: string;
  colorName: string;
  coverage: Coverage;
  priceMultiplier: number;
}

export interface ModsConfig {
  wheelsId: string;
  wheelsName: string;
  spoilerId: string;
  spoilerName: string;
  bodykitId: string;
  bodykitName: string;
}

export interface AppearanceConfig {
  liveryId: string;
  liveryName: string;
  wheelColor: string;
  wheelColorName: string;
  caliperColor: string;
  caliperColorName: string;
}

export interface CarConfig {
  vehicleId: string;
  vehicleName: string;
  paint: PaintConfig;
  mods: ModsConfig;
  appearance: AppearanceConfig;
}

export interface PriceLine {
  label: string;
  amount: number;
}

export interface QuoteResult {
  lines: PriceLine[];
  total: number;
}

export interface CatalogOption {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  paintType: PaintType;
  priceMultiplier: number;
}

export interface FinishColorOption {
  id: string;
  name: string;
  hex: string;
}

export interface LiveryOption {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  tint: string;
}

export interface VehicleMaterialNames {
  bodyPaint: string[];
  bodyPaintNodes?: string[];
  livery?: string;
  windows?: string;
  lights?: Record<string, { color: string; intensity: number }>;
  wheels: string[];
  wheelNodes?: string[];
  tires?: string[];
  caliper?: string;
}

export interface VehicleDefinition {
  id: string;
  name: string;
  isCustom?: boolean;
  modelPath: string;
  sourceUrl: string;
  sourceLabel: string;
  rotation?: [number, number, number];
  capabilities: {
    livery: boolean;
  };
  materialNames: VehicleMaterialNames;
}

export interface CustomVehicleDefinition extends VehicleDefinition {
  isCustom: true;
  fileName: string;
  fileSize: number;
  availableMaterials: string[];
}

export interface ShopInfo {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string;
  openHours: string;
}
