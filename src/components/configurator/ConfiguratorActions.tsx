"use client";

import { useEffect, useRef, useState } from "react";
import {
  BODYKITS,
  CALIPER_COLORS,
  COVERAGE_OPTIONS,
  DEFAULT_VEHICLE,
  LIVERIES,
  PAINT_COLORS,
  SPOILERS,
  VEHICLES,
  WHEELS,
  WHEEL_COLORS,
} from "@/lib/catalog";
import { useConfigStore } from "@/store/configStore";

interface SharedConfig {
  v: 1 | 2;
  vehicle: string;
  paint: string;
  coverage: string;
  livery: string;
  wheelColor: string;
  caliperColor: string;
  wheels: string;
  spoiler: string;
  bodykit: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeSharedConfig(value: string): SharedConfig | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const parsed: unknown = JSON.parse(window.atob(padded));

    if (!isRecord(parsed) || (parsed.v !== 1 && parsed.v !== 2)) return null;

    const fields = [
      "paint",
      "coverage",
      "livery",
      "wheelColor",
      "caliperColor",
      "wheels",
      "spoiler",
      "bodykit",
    ] as const;
    if (fields.some((field) => typeof parsed[field] !== "string")) {
      return null;
    }

    const config = {
      ...(parsed as unknown as Omit<SharedConfig, "vehicle">),
      vehicle:
        parsed.v === 2 && typeof parsed.vehicle === "string"
          ? parsed.vehicle
          : DEFAULT_VEHICLE.id,
    };
    const valid =
      VEHICLES.some((item) => item.id === config.vehicle) &&
      PAINT_COLORS.some((item) => item.id === config.paint) &&
      COVERAGE_OPTIONS.some((item) => item.id === config.coverage) &&
      LIVERIES.some((item) => item.id === config.livery) &&
      WHEEL_COLORS.some((item) => item.id === config.wheelColor) &&
      CALIPER_COLORS.some((item) => item.id === config.caliperColor) &&
      WHEELS.some((item) => item.id === config.wheels) &&
      SPOILERS.some((item) => item.id === config.spoiler) &&
      BODYKITS.some((item) => item.id === config.bodykit);

    return valid ? config : null;
  } catch {
    return null;
  }
}

function encodeSharedConfig(config: SharedConfig) {
  return window
    .btoa(JSON.stringify(config))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export default function ConfiguratorActions() {
  const config = useConfigStore((state) => state.config);
  const customVehicle = useConfigStore((state) => state.customVehicle);
  const setVehicle = useConfigStore((state) => state.setVehicle);
  const setPaintColor = useConfigStore((state) => state.setPaintColor);
  const setCoverage = useConfigStore((state) => state.setCoverage);
  const setLivery = useConfigStore((state) => state.setLivery);
  const setWheelColor = useConfigStore((state) => state.setWheelColor);
  const setCaliperColor = useConfigStore((state) => state.setCaliperColor);
  const setWheels = useConfigStore((state) => state.setWheels);
  const setSpoiler = useConfigStore((state) => state.setSpoiler);
  const setBodykit = useConfigStore((state) => state.setBodykit);
  const loadedShare = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notice, setNotice] = useState("");

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 2200);
  }

  useEffect(() => {
    if (loadedShare.current) return;
    loadedShare.current = true;

    const encoded = new URLSearchParams(window.location.search).get("config");
    if (!encoded) return;

    const shared = decodeSharedConfig(encoded);
    if (!shared) return;

    setVehicle(shared.vehicle);
    setPaintColor(shared.paint);
    setCoverage(
      shared.coverage as (typeof COVERAGE_OPTIONS)[number]["id"],
    );
    setLivery(shared.livery);
    setWheelColor(shared.wheelColor);
    setCaliperColor(shared.caliperColor);
    setWheels(shared.wheels);
    setSpoiler(shared.spoiler);
    setBodykit(shared.bodykit);
  }, [
    setBodykit,
    setCaliperColor,
    setCoverage,
    setLivery,
    setPaintColor,
    setSpoiler,
    setWheelColor,
    setWheels,
    setVehicle,
  ]);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  async function shareConfig() {
    if (customVehicle?.id === config.vehicleId) {
      showNotice("本地上传模型无法通过链接分享");
      return;
    }

    const paint = PAINT_COLORS.find(
      (item) => item.hex.toLowerCase() === config.paint.color.toLowerCase(),
    );
    const wheelColor = WHEEL_COLORS.find(
      (item) =>
        item.hex.toLowerCase() === config.appearance.wheelColor.toLowerCase(),
    );
    const caliperColor = CALIPER_COLORS.find(
      (item) =>
        item.hex.toLowerCase() === config.appearance.caliperColor.toLowerCase(),
    );

    if (!paint || !wheelColor || !caliperColor) {
      showNotice("当前方案无法分享");
      return;
    }

    const shared: SharedConfig = {
      v: 2,
      vehicle: config.vehicleId,
      paint: paint.id,
      coverage: config.paint.coverage,
      livery: config.appearance.liveryId,
      wheelColor: wheelColor.id,
      caliperColor: caliperColor.id,
      wheels: config.mods.wheelsId,
      spoiler: config.mods.spoilerId,
      bodykit: config.mods.bodykitId,
    };
    const url = new URL(window.location.href);
    url.searchParams.set("config", encodeSharedConfig(shared));

    try {
      await copyText(url.toString());
      window.history.replaceState(null, "", url);
      showNotice("方案链接已复制");
    } catch {
      showNotice("复制失败，请手动复制地址栏");
    }
  }

  function downloadSnapshot() {
    const canvas = document.querySelector<HTMLCanvasElement>(
      "#car-configurator canvas",
    );
    if (!canvas) {
      showNotice("3D 画面尚未就绪");
      return;
    }

    try {
      const link = document.createElement("a");
      link.download = `${config.vehicleId}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showNotice("方案图片已下载");
    } catch {
      showNotice("图片导出失败");
    }
  }

  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
      {notice && (
        <span
          role="status"
          className="rounded-lg bg-black/75 px-3 py-2 text-xs text-zinc-200 backdrop-blur"
        >
          {notice}
        </span>
      )}
      <button
        type="button"
        onClick={downloadSnapshot}
        className="rounded-lg border border-white/15 bg-black/65 px-3 py-2 text-xs font-medium text-zinc-200 backdrop-blur transition hover:bg-zinc-800"
      >
        下载截图
      </button>
      <button
        type="button"
        onClick={shareConfig}
        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
      >
        分享方案
      </button>
    </div>
  );
}
