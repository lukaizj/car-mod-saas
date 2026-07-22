import {
  BODYKITS,
  CALIPER_COLORS,
  COVERAGE_OPTIONS,
  DEFAULT_VEHICLE,
  LIVERIES,
  PAINT_COLORS,
  SPOILERS,
  TIME_SLOTS,
  WHEELS,
  WHEEL_COLORS,
} from "./catalog";
import type { CarConfig } from "./types";

interface AppointmentInput {
  config: CarConfig;
  customer: string;
  phone: string;
  date: string;
  timeSlot: string;
  note: string | null;
}

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const APPOINTMENT_STATUSES = ["pending", "confirmed", "cancelled"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePhone(value: string) {
  const compact = value.replace(/[\s-]/g, "");
  return compact.replace(/^(?:\+86|0086|86)/, "");
}

function isCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return (
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day)
  );
}

function dateInShanghai(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function normalizeConfig(value: unknown): ValidationResult<CarConfig> {
  if (!isRecord(value)) {
    return { success: false, error: "车辆配置格式无效" };
  }
  const paint = value.paint;
  const mods = value.mods;
  if (!isRecord(paint) || !isRecord(mods)) {
    return { success: false, error: "车辆配置格式无效" };
  }

  if (value.vehicleId !== DEFAULT_VEHICLE.id) {
    return { success: false, error: "不支持的车型" };
  }

  const colorValue = paint.color;
  if (typeof colorValue !== "string") {
    return { success: false, error: "车漆选项无效" };
  }

  const color = PAINT_COLORS.find(
    (option) => option.hex.toLowerCase() === colorValue.toLowerCase(),
  );
  if (!color) {
    return { success: false, error: "车漆选项不存在" };
  }

  const coverage = COVERAGE_OPTIONS.find(
    (option) => option.id === paint.coverage,
  );
  if (!coverage) {
    return { success: false, error: "施工范围无效" };
  }

  const wheels = WHEELS.find((option) => option.id === mods.wheelsId);
  const spoiler = SPOILERS.find((option) => option.id === mods.spoilerId);
  const bodykit = BODYKITS.find((option) => option.id === mods.bodykitId);
  if (!wheels || !spoiler || !bodykit) {
    return { success: false, error: "改装配件选项无效" };
  }

  let livery = LIVERIES[0];
  let wheelColor = WHEEL_COLORS[0];
  let caliperColor = CALIPER_COLORS[0];
  if (value.appearance !== undefined) {
    if (!isRecord(value.appearance)) {
      return { success: false, error: "外观配置格式无效" };
    }

    const appearance = value.appearance;
    const selectedLivery = LIVERIES.find(
      (option) => option.id === appearance.liveryId,
    );
    const selectedWheelColor = WHEEL_COLORS.find(
      (option) =>
        typeof appearance.wheelColor === "string" &&
        option.hex.toLowerCase() === appearance.wheelColor.toLowerCase(),
    );
    const selectedCaliperColor = CALIPER_COLORS.find(
      (option) =>
        typeof appearance.caliperColor === "string" &&
        option.hex.toLowerCase() === appearance.caliperColor.toLowerCase(),
    );
    if (!selectedLivery || !selectedWheelColor || !selectedCaliperColor) {
      return { success: false, error: "外观选项无效" };
    }
    livery = selectedLivery;
    wheelColor = selectedWheelColor;
    caliperColor = selectedCaliperColor;
  }

  return {
    success: true,
    data: {
      vehicleId: DEFAULT_VEHICLE.id,
      vehicleName: DEFAULT_VEHICLE.name,
      paint: {
        type: color.paintType,
        color: color.hex,
        colorName: color.name,
        coverage: coverage.id,
        priceMultiplier: color.priceMultiplier,
      },
      mods: {
        wheelsId: wheels.id,
        wheelsName: wheels.name,
        spoilerId: spoiler.id,
        spoilerName: spoiler.name,
        bodykitId: bodykit.id,
        bodykitName: bodykit.name,
      },
      appearance: {
        liveryId: livery.id,
        liveryName: livery.name,
        wheelColor: wheelColor.hex,
        wheelColorName: wheelColor.name,
        caliperColor: caliperColor.hex,
        caliperColorName: caliperColor.name,
      },
    },
  };
}

export function validateAppointmentInput(
  value: unknown,
  now = new Date(),
): ValidationResult<AppointmentInput> {
  if (!isRecord(value)) {
    return { success: false, error: "请求格式无效" };
  }

  const configResult = normalizeConfig(value.config);
  if (!configResult.success) return configResult;

  if (typeof value.customer !== "string") {
    return { success: false, error: "姓名格式无效" };
  }
  const customer = value.customer.trim();
  if (!customer || customer.length > 80) {
    return { success: false, error: "姓名长度应为 1 至 80 个字符" };
  }

  if (typeof value.phone !== "string") {
    return { success: false, error: "手机号格式无效" };
  }
  const phone = normalizePhone(value.phone.trim());
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, error: "请输入有效的中国大陆手机号" };
  }

  if (typeof value.date !== "string" || !isCalendarDate(value.date)) {
    return { success: false, error: "预约日期格式无效" };
  }
  if (value.date <= dateInShanghai(now)) {
    return { success: false, error: "预约日期必须晚于今天" };
  }

  if (
    typeof value.timeSlot !== "string" ||
    !TIME_SLOTS.includes(value.timeSlot)
  ) {
    return { success: false, error: "预约时段无效" };
  }

  if (
    value.note !== undefined &&
    value.note !== null &&
    typeof value.note !== "string"
  ) {
    return { success: false, error: "备注格式无效" };
  }
  const note = typeof value.note === "string" ? value.note.trim() : "";
  if (note.length > 500) {
    return { success: false, error: "备注不能超过 500 个字符" };
  }

  return {
    success: true,
    data: {
      config: configResult.data,
      customer,
      phone,
      date: value.date,
      timeSlot: value.timeSlot,
      note: note || null,
    },
  };
}

export function validateAppointmentStatus(
  value: unknown,
): ValidationResult<(typeof APPOINTMENT_STATUSES)[number]> {
  if (!isRecord(value) || typeof value.status !== "string") {
    return { success: false, error: "状态格式无效" };
  }

  const status = APPOINTMENT_STATUSES.find((item) => item === value.status);
  return status
    ? { success: true, data: status }
    : { success: false, error: "无效状态" };
}
