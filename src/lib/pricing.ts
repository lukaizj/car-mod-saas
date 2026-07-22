import { BODYKITS, COVERAGE_OPTIONS, SPOILERS, WHEELS } from "./catalog";
import type { CarConfig, QuoteResult } from "./types";

const LABOR_RATES = {
  wheels: 800,
  spoiler: 600,
  bodykit: 3500,
};

export function calculateQuote(config: CarConfig): QuoteResult {
  const lines: QuoteResult["lines"] = [];
  const coverage = COVERAGE_OPTIONS.find((c) => c.id === config.paint.coverage)!;
  const paintBase = Math.round(coverage.basePrice * config.paint.priceMultiplier);

  const paintLabel =
    config.paint.type === "wrap"
      ? `贴膜 · ${config.paint.colorName} · ${coverage.name}`
      : `改色 · ${config.paint.colorName} · ${coverage.name}`;

  lines.push({ label: paintLabel, amount: paintBase });

  const wheels = WHEELS.find((w) => w.id === config.mods.wheelsId);
  if (wheels && wheels.id !== "stock") {
    lines.push({ label: `轮毂 · ${wheels.name}`, amount: wheels.price });
    lines.push({ label: "轮毂安装工时", amount: LABOR_RATES.wheels });
  }

  const spoiler = SPOILERS.find((s) => s.id === config.mods.spoilerId);
  if (spoiler && spoiler.id !== "stock") {
    lines.push({ label: `尾翼 · ${spoiler.name}`, amount: spoiler.price });
    lines.push({ label: "尾翼安装工时", amount: LABOR_RATES.spoiler });
  }

  const bodykit = BODYKITS.find((b) => b.id === config.mods.bodykitId);
  if (bodykit && bodykit.id !== "stock") {
    lines.push({ label: `包围 · ${bodykit.name}`, amount: bodykit.price });
    lines.push({ label: "包围安装工时", amount: LABOR_RATES.bodykit });
  }

  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return { lines, total };
}
