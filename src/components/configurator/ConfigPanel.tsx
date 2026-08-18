"use client";

import clsx from "clsx";
import CustomModelUpload from "./CustomModelUpload";
import {
  BODYKITS,
  CALIPER_COLORS,
  COVERAGE_OPTIONS,
  getVehicle,
  LIVERIES,
  PAINT_COLORS,
  SPOILERS,
  VEHICLES,
  WHEELS,
  WHEEL_COLORS,
} from "@/lib/catalog";
import { soundEffects } from "@/lib/soundEffects";
import { useConfigStore } from "@/store/configStore";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ColorSwatches({
  options,
  selected,
  onSelect,
}: {
  options: { id: string; name: string; hex: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map((color) => (
        <button
          key={color.id}
          type="button"
          title={color.name}
          aria-label={color.name}
          aria-pressed={selected === color.hex}
          onClick={() => onSelect(color.id)}
          className={clsx(
            "aspect-square rounded-xl border-2 transition-transform hover:scale-105",
            selected === color.hex
              ? "border-white ring-2 ring-white/30"
              : "border-transparent",
          )}
          style={{ backgroundColor: color.hex }}
        />
      ))}
    </div>
  );
}

function OptionButtons({
  options,
  selected,
  onSelect,
  quoteOnly = false,
}: {
  options: { id: string; name: string; price: number; description?: string }[];
  selected: string;
  onSelect: (id: string) => void;
  quoteOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          className={clsx(
            "w-full rounded-xl border px-4 py-3 text-left transition-colors",
            selected === opt.id
              ? "border-blue-500 bg-blue-500/10"
              : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-medium text-sm">
              {opt.name}
              {quoteOnly && opt.id !== "stock" && (
                <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-zinc-300">
                  仅报价
                </span>
              )}
            </span>
            <span className="text-xs text-zinc-400">
              {opt.price === 0 ? "含" : `+¥${opt.price.toLocaleString()}`}
            </span>
          </div>
          {opt.description && (
            <p className="mt-1 text-xs text-zinc-500">{opt.description}</p>
          )}
        </button>
      ))}
    </div>
  );
}

export default function ConfigPanel() {
  const {
    config,
    setVehicle: rawSetVehicle,
    setPaintColor: rawSetPaintColor,
    setCoverage: rawSetCoverage,
    setLivery: rawSetLivery,
    setWheelColor: rawSetWheelColor,
    setCaliperColor: rawSetCaliperColor,
    setWheels: rawSetWheels,
    setSpoiler: rawSetSpoiler,
    setBodykit: rawSetBodykit,
  } = useConfigStore();

  const setVehicle = (id: string) => {
    soundEffects.playPartSnap();
    rawSetVehicle(id);
  };
  const setPaintColor = (id: string) => {
    soundEffects.playPaintSpray();
    rawSetPaintColor(id);
  };
  const setCoverage = (id: (typeof COVERAGE_OPTIONS)[number]["id"]) => {
    soundEffects.playPartSnap();
    rawSetCoverage(id);
  };
  const setLivery = (id: string) => {
    soundEffects.playPaintSpray();
    rawSetLivery(id);
  };
  const setWheelColor = (id: string) => {
    soundEffects.playPaintSpray();
    rawSetWheelColor(id);
  };
  const setCaliperColor = (id: string) => {
    soundEffects.playPaintSpray();
    rawSetCaliperColor(id);
  };
  const setWheels = (id: string) => {
    soundEffects.playPartSnap();
    rawSetWheels(id);
  };
  const setSpoiler = (id: string) => {
    soundEffects.playPartSnap();
    rawSetSpoiler(id);
  };
  const setBodykit = (id: string) => {
    soundEffects.playPartSnap();
    rawSetBodykit(id);
  };
  const coverage = COVERAGE_OPTIONS.find(
    (option) => option.id === config.paint.coverage,
  );
  const customVehicle = useConfigStore((state) => state.customVehicle);
  const vehicle =
    customVehicle?.id === config.vehicleId
      ? customVehicle
      : getVehicle(config.vehicleId);

  return (
    <div className="flex flex-col gap-6 overflow-y-auto pr-1">
      <Section title="选择车型">
        <div className="grid grid-cols-2 gap-2">
          {VEHICLES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setVehicle(option.id)}
              className={clsx(
                "rounded-xl border px-3 py-3 text-left transition-colors",
                config.vehicleId === option.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500",
              )}
            >
              <span className="block text-sm font-medium">{option.name}</span>
            </button>
          ))}
          {customVehicle && (
            <button
              type="button"
              onClick={() => setVehicle(customVehicle.id)}
              className={clsx(
                "rounded-xl border px-3 py-3 text-left transition-colors",
                config.vehicleId === customVehicle.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500",
              )}
            >
              <span className="block text-sm font-medium">
                {customVehicle.name}
              </span>
              <span className="mt-1 block text-xs text-zinc-500">本地上传</span>
            </button>
          )}
        </div>
      </Section>

      <CustomModelUpload />

      <Section title="车身颜色 / 材质">
        <p className="text-xs text-zinc-500">
          当前：{config.paint.colorName}
          {config.paint.type === "wrap" ? "（贴膜）" : ""}
        </p>
        <ColorSwatches
          options={PAINT_COLORS}
          selected={config.paint.color}
          onSelect={setPaintColor}
        />
        <p className="text-xs font-medium text-zinc-400">施工报价范围</p>
        <div className="flex gap-2">
          {COVERAGE_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCoverage(c.id)}
              className={clsx(
                "flex-1 rounded-lg border py-2 text-xs font-medium",
                config.paint.coverage === c.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-zinc-700 hover:border-zinc-500",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
        <p className="rounded-lg bg-zinc-800/70 px-3 py-2 text-xs leading-relaxed text-zinc-400">
          {config.paint.coverage === "full"
            ? "全车颜色与材质已在 3D 中实时预览。"
            : `${coverage?.name ?? "局部"}当前仅影响报价；现有模型未拆分对应车身区域，3D 暂以全车效果示意。`}
        </p>
      </Section>

      <Section title="贴膜 / 拉花 · 实时预览">
        {vehicle.capabilities.livery ? (
          <div className="grid grid-cols-2 gap-2">
            {LIVERIES.map((livery) => (
              <button
                key={livery.id}
                type="button"
                onClick={() => setLivery(livery.id)}
                className={clsx(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  config.appearance.liveryId === livery.id
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500",
                )}
              >
                <span className="block text-sm font-medium">{livery.name}</span>
                <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                  {livery.description}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-zinc-800/70 px-3 py-2 text-xs leading-relaxed text-zinc-400">
            当前车型暂未提供独立拉花层，仅展示纯色车漆。
          </p>
        )}
      </Section>

      <Section title="轮毂颜色 · 实时预览">
        <p className="text-xs text-zinc-500">
          当前：{config.appearance.wheelColorName}
        </p>
        <ColorSwatches
          options={WHEEL_COLORS}
          selected={config.appearance.wheelColor}
          onSelect={setWheelColor}
        />
      </Section>

      <Section title="轮毂款式 · 仅报价">
        <OptionButtons
          options={WHEELS}
          selected={config.mods.wheelsId}
          onSelect={setWheels}
          quoteOnly
        />
        <p className="text-xs leading-relaxed text-zinc-500">
          款式选择会进入报价单，但不会更换 3D 轮毂模型；需接入独立轮毂 GLB 后才能实时预览。
        </p>
      </Section>

      <Section title="卡钳颜色 · 实时预览">
        <p className="text-xs text-zinc-500">
          当前：{config.appearance.caliperColorName}
        </p>
        <ColorSwatches
          options={CALIPER_COLORS}
          selected={config.appearance.caliperColor}
          onSelect={setCaliperColor}
        />
      </Section>

      <Section title="尾翼 · 仅报价">
        <OptionButtons
          options={SPOILERS}
          selected={config.mods.spoilerId}
          onSelect={setSpoiler}
          quoteOnly
        />
      </Section>

      <Section title="包围 · 仅报价">
        <OptionButtons
          options={BODYKITS}
          selected={config.mods.bodykitId}
          onSelect={setBodykit}
          quoteOnly
        />
      </Section>
    </div>
  );
}
