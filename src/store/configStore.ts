"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BODYKITS,
  CALIPER_COLORS,
  DEFAULT_VEHICLE,
  getVehicle,
  LIVERIES,
  PAINT_COLORS,
  SPOILERS,
  WHEELS,
  WHEEL_COLORS,
} from "@/lib/catalog";
import { mergeMaterialMapping } from "@/lib/modelMaterialMapping";
import type { CarConfig, CustomVehicleDefinition } from "@/lib/types";

const defaultColor = PAINT_COLORS[1];

interface ConfigState {
  config: CarConfig;
  customVehicle: CustomVehicleDefinition | null;
  setVehicle: (vehicleId: string) => void;
  setCustomVehicle: (vehicle: CustomVehicleDefinition) => void;
  clearCustomVehicle: () => void;
  setCustomMaterialCatalog: (materialNames: string[]) => void;
  setCustomBodyPaint: (materialNames: string[]) => void;
  setCustomWindowMaterial: (materialName?: string) => void;
  setPaintColor: (colorId: string) => void;
  setCoverage: (coverage: CarConfig["paint"]["coverage"]) => void;
  setLivery: (id: string) => void;
  setWheelColor: (id: string) => void;
  setCaliperColor: (id: string) => void;
  setWheels: (id: string) => void;
  setSpoiler: (id: string) => void;
  setBodykit: (id: string) => void;
  reset: () => void;
}

const initialConfig: CarConfig = {
  vehicleId: DEFAULT_VEHICLE.id,
  vehicleName: DEFAULT_VEHICLE.name,
  paint: {
    type: defaultColor.paintType,
    color: defaultColor.hex,
    colorName: defaultColor.name,
    coverage: "full",
    priceMultiplier: defaultColor.priceMultiplier,
  },
  mods: {
    wheelsId: "stock",
    wheelsName: WHEELS[0].name,
    spoilerId: "stock",
    spoilerName: SPOILERS[0].name,
    bodykitId: "stock",
    bodykitName: BODYKITS[0].name,
  },
  appearance: {
    liveryId: LIVERIES[0].id,
    liveryName: LIVERIES[0].name,
    wheelColor: WHEEL_COLORS[0].hex,
    wheelColorName: WHEEL_COLORS[0].name,
    caliperColor: CALIPER_COLORS[0].hex,
    caliperColorName: CALIPER_COLORS[0].name,
  },
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      config: initialConfig,
      customVehicle: null,
      setVehicle: (vehicleId) => {
        const customVehicle = get().customVehicle;
        const vehicle =
          customVehicle?.id === vehicleId
            ? customVehicle
            : getVehicle(vehicleId);
        set({
          config: {
            ...get().config,
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            appearance: {
              ...get().config.appearance,
              liveryId: LIVERIES[0].id,
              liveryName: LIVERIES[0].name,
            },
          },
        });
      },
      setCustomVehicle: (vehicle) => {
        set({
          customVehicle: vehicle,
          config: {
            ...get().config,
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            appearance: {
              ...get().config.appearance,
              liveryId: LIVERIES[0].id,
              liveryName: LIVERIES[0].name,
            },
          },
        });
      },
      clearCustomVehicle: () => {
        const wasSelected = get().config.vehicleId === get().customVehicle?.id;
        set({
          customVehicle: null,
          config: wasSelected
            ? {
                ...get().config,
                vehicleId: DEFAULT_VEHICLE.id,
                vehicleName: DEFAULT_VEHICLE.name,
              }
            : get().config,
        });
      },
      setCustomMaterialCatalog: (materialNames) => {
        const customVehicle = get().customVehicle;
        if (!customVehicle) return;

        const availableMaterials = [...new Set(materialNames)].sort((a, b) =>
          a.localeCompare(b),
        );
        const merged = mergeMaterialMapping(
          customVehicle.materialNames,
          availableMaterials,
        );
        const mappingChanged =
          JSON.stringify(merged) !== JSON.stringify(customVehicle.materialNames);
        if (
          availableMaterials.length === customVehicle.availableMaterials.length &&
          availableMaterials.every(
            (name, index) => name === customVehicle.availableMaterials[index],
          ) &&
          !mappingChanged
        ) {
          return;
        }

        set({
          customVehicle: {
            ...customVehicle,
            availableMaterials,
            materialNames: merged,
          },
        });
      },
      setCustomBodyPaint: (materialNames) => {
        const customVehicle = get().customVehicle;
        if (!customVehicle) return;

        set({
          customVehicle: {
            ...customVehicle,
            materialNames: {
              ...customVehicle.materialNames,
              bodyPaint: materialNames,
            },
          },
        });
      },
      setCustomWindowMaterial: (materialName) => {
        const customVehicle = get().customVehicle;
        if (!customVehicle) return;

        set({
          customVehicle: {
            ...customVehicle,
            materialNames: {
              ...customVehicle.materialNames,
              windows: materialName,
            },
          },
        });
      },
      setPaintColor: (colorId) => {
        const color = PAINT_COLORS.find((c) => c.id === colorId);
        if (!color) return;
        set({
          config: {
            ...get().config,
            paint: {
              ...get().config.paint,
              type: color.paintType,
              color: color.hex,
              colorName: color.name,
              priceMultiplier: color.priceMultiplier,
            },
          },
        });
      },
      setCoverage: (coverage) => {
        const config = get().config;
        set({
          config: {
            ...config,
            paint: { ...config.paint, coverage },
            appearance:
              coverage === "full"
                ? {
                    ...config.appearance,
                    liveryId: LIVERIES[0].id,
                    liveryName: LIVERIES[0].name,
                  }
                : config.appearance,
          },
        });
      },
      setLivery: (id) => {
        const item = LIVERIES.find((livery) => livery.id === id);
        if (!item) return;
        set({
          config: {
            ...get().config,
            appearance: {
              ...get().config.appearance,
              liveryId: item.id,
              liveryName: item.name,
            },
          },
        });
      },
      setWheelColor: (id) => {
        const item = WHEEL_COLORS.find((color) => color.id === id);
        if (!item) return;
        set({
          config: {
            ...get().config,
            appearance: {
              ...get().config.appearance,
              wheelColor: item.hex,
              wheelColorName: item.name,
            },
          },
        });
      },
      setCaliperColor: (id) => {
        const item = CALIPER_COLORS.find((color) => color.id === id);
        if (!item) return;
        set({
          config: {
            ...get().config,
            appearance: {
              ...get().config.appearance,
              caliperColor: item.hex,
              caliperColorName: item.name,
            },
          },
        });
      },
      setWheels: (id) => {
        const item = WHEELS.find((w) => w.id === id);
        if (!item) return;
        set({
          config: {
            ...get().config,
            mods: { ...get().config.mods, wheelsId: id, wheelsName: item.name },
          },
        });
      },
      setSpoiler: (id) => {
        const item = SPOILERS.find((s) => s.id === id);
        if (!item) return;
        set({
          config: {
            ...get().config,
            mods: { ...get().config.mods, spoilerId: id, spoilerName: item.name },
          },
        });
      },
      setBodykit: (id) => {
        const item = BODYKITS.find((b) => b.id === id);
        if (!item) return;
        set({
          config: {
            ...get().config,
            mods: { ...get().config.mods, bodykitId: id, bodykitName: item.name },
          },
        });
      },
      reset: () => set({ config: initialConfig }),
    }),
    {
      name: "car-mod-config",
      version: 3,
      migrate: (persisted, version) => {
        if (version >= 3) return persisted as ConfigState;

        const state = persisted as Partial<ConfigState>;
        if (!state.config) return state as ConfigState;

        return {
          ...state,
          config: {
            ...state.config,
            appearance: {
              ...state.config.appearance,
              liveryId: LIVERIES[0].id,
              liveryName: LIVERIES[0].name,
            },
          },
        } as ConfigState;
      },
      partialize: (state) => ({
        config: state.config,
        customVehicle: state.customVehicle,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ConfigState>;
        const persistedConfig = persistedState.config as
          | Partial<CarConfig>
          | undefined;

        const config = {
          ...initialConfig,
          ...persistedConfig,
          paint: {
            ...initialConfig.paint,
            ...persistedConfig?.paint,
          },
          mods: {
            ...initialConfig.mods,
            ...persistedConfig?.mods,
          },
          appearance: {
            ...initialConfig.appearance,
            ...persistedConfig?.appearance,
          },
        };
        const customVehicle = persistedState.customVehicle ?? null;
        const vehicleExists =
          customVehicle?.id === config.vehicleId ||
          config.vehicleId === DEFAULT_VEHICLE.id ||
          getVehicle(config.vehicleId).id === config.vehicleId;

        return {
          ...current,
          ...persistedState,
          customVehicle,
          config: vehicleExists
            ? config
            : {
                ...config,
                vehicleId: DEFAULT_VEHICLE.id,
                vehicleName: DEFAULT_VEHICLE.name,
              },
        };
      },
    },
  ),
);
