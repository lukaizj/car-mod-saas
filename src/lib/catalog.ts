import type {
  CatalogOption,
  ColorOption,
  FinishColorOption,
  LiveryOption,
  VehicleDefinition,
} from "./types";

export const VEHICLES: VehicleDefinition[] = [
  {
    id: "bmw-m4-competition",
    name: "BMW M4 Competition",
    modelPath: "/models/bmw-m4.web.glb",
    sourceUrl:
      "https://sketchfab.com/3d-models/bmw-m4-competition-m-package-5c0a2dafb1ad408d9fc9eeef9aee531b",
    sourceLabel: "3D 模型 · CC BY 4.0",
    capabilities: { livery: true },
    materialNames: {
      bodyPaint: ["Mesheszx1Mtl", "Meshesbody151Mtl"],
      bodyPaintNodes: ["Object_24", "Object_30"],
      livery: "Mesheslivery1Mtl",
      windows: "Mesheswindows1Mtl",
      wheels: ["Meshesm8rim1Mtl"],
      caliper: "Caliper1Mtl",
    },
  },
  {
    id: "audi-rs6-avant",
    name: "Audi RS6 Avant",
    modelPath: "/models/audi-rs6.web.glb",
    sourceUrl: "https://github.com/armis-kan/perfekt-app",
    sourceLabel: "3D 模型 · 非商用素材",
    capabilities: { livery: false },
    materialNames: {
      bodyPaint: ["CARI_PAINT"],
      windows: "Glass",
      wheels: ["RIM_BRIGHT"],
      wheelNodes: [
        "Object_296",
        "Object_308",
        "Object_315",
        "Object_325",
        "Object_340",
        "Object_342",
      ],
      caliper: "Brake_Kit",
    },
  },
  {
    id: "tesla-model3",
    name: "Tesla Model 3",
    modelPath: "/models/tesla-model3.web.glb",
    sourceUrl: "https://github.com/varrff/Model3ThreeJsExpo",
    sourceLabel: "3D 模型 · CC BY 4.0",
    capabilities: { livery: false },
    materialNames: {
      bodyPaint: ["primary.003", "primary.005", "primary.006", "primary.007"],
      windows: "glass.002",
      wheels: ["wheels.005", "wheels.009"],
      caliper: "movsteer_1.0.002",
    },
  },
];

export const DEFAULT_VEHICLE = VEHICLES[0];

export function getVehicle(vehicleId: string) {
  return VEHICLES.find((vehicle) => vehicle.id === vehicleId) ?? DEFAULT_VEHICLE;
}

export const PAINT_COLORS: ColorOption[] = [
  { id: "alpine-white", name: "Alpine White", hex: "#F2F2F2", paintType: "solid", priceMultiplier: 1 },
  { id: "black-sapphire", name: "Black Sapphire", hex: "#1A1A1A", paintType: "metallic", priceMultiplier: 1.2 },
  { id: "miami-blue", name: "Miami Blue", hex: "#0078D7", paintType: "metallic", priceMultiplier: 1.25 },
  { id: "matte-grey", name: "Matte Grey Wrap", hex: "#4A4A4A", paintType: "matte", priceMultiplier: 1.4 },
  { id: "satin-black", name: "Satin Black Wrap", hex: "#111111", paintType: "wrap", priceMultiplier: 1.5 },
  { id: "nardo-grey", name: "Nardo Grey", hex: "#6E6E6E", paintType: "matte", priceMultiplier: 1.35 },
  { id: "racing-red", name: "Racing Red", hex: "#C41E3A", paintType: "metallic", priceMultiplier: 1.2 },
  { id: "british-racing-green", name: "British Racing Green", hex: "#004225", paintType: "metallic", priceMultiplier: 1.25 },
];

export const LIVERIES: LiveryOption[] = [
  {
    id: "none",
    name: "无拉花",
    description: "仅展示车身漆面",
    visible: false,
    tint: "#ffffff",
  },
  {
    id: "m-stripes",
    name: "M 三色拉花",
    description: "使用模型自带的 M Performance 图层",
    visible: true,
    tint: "#ffffff",
  },
  {
    id: "shadow",
    name: "暗影拉花",
    description: "深色低对比度运动图案",
    visible: true,
    tint: "#555b66",
  },
  {
    id: "ice-blue",
    name: "冰蓝拉花",
    description: "冰蓝色调的运动图案",
    visible: true,
    tint: "#73bfff",
  },
];

export const WHEEL_COLORS: FinishColorOption[] = [
  { id: "satin-black", name: "缎面黑", hex: "#17191c" },
  { id: "gunmetal", name: "枪灰", hex: "#4a4f55" },
  { id: "brushed-silver", name: "拉丝银", hex: "#b8bcc2" },
  { id: "bronze", name: "古铜", hex: "#8a6138" },
];

export const CALIPER_COLORS: FinishColorOption[] = [
  { id: "m-red", name: "M 红", hex: "#c5162e" },
  { id: "racing-yellow", name: "赛道黄", hex: "#f0bd16" },
  { id: "electric-blue", name: "电光蓝", hex: "#087fd7" },
  { id: "stealth-black", name: "隐形黑", hex: "#18191b" },
];

export const WHEELS: CatalogOption[] = [
  { id: "stock", name: "原厂轮毂", price: 0, description: "当前车型原厂轮毂" },
  { id: "bbs-fi-r", name: "BBS FI-R", price: 28000, description: "20\" 锻造竞技轮毂" },
  { id: "hre-p101", name: "HRE P101", price: 42000, description: "21\" 单片锻造" },
  { id: "adv1-005", name: "ADV.1 005", price: 35000, description: "20\" 多辐条" },
];

export const SPOILERS: CatalogOption[] = [
  { id: "stock", name: "原厂尾翼", price: 0 },
  { id: "carbon-lip", name: "碳纤维小尾翼", price: 3800 },
  { id: "gt4", name: "GT4 大尾翼", price: 12800 },
  { id: "ducktail", name: "鸭尾", price: 5600 },
];

export const BODYKITS: CatalogOption[] = [
  { id: "stock", name: "原厂包围", price: 0 },
  { id: "m-performance", name: "M Performance 套件", price: 18500 },
  { id: "vorsteiner", name: "Vorsteiner 宽体", price: 68000 },
  { id: "liberty-walk", name: "Liberty Walk", price: 98000 },
];

export const COVERAGE_OPTIONS = [
  { id: "full" as const, name: "全车", basePrice: 12000 },
  { id: "roof" as const, name: "车顶", basePrice: 2800 },
  { id: "hood" as const, name: "引擎盖", basePrice: 3200 },
];

export const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00",
];
