function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
import { drawQrToCanvas } from "./qr";
import type { CarConfig, QuoteResult } from "./types";

export interface PosterOptions {
  carCanvas: HTMLCanvasElement;
  config: CarConfig;
  quote: QuoteResult;
  vehicleName: string;
  shareUrl: string;
  shopName?: string;
  shopAddress?: string;
}

export function generatePosterCanvas({
  carCanvas,
  config,
  quote,
  vehicleName,
  shareUrl,
  shopName = "极速贴膜 · 改装工坊 (官方认证中心)",
  shopAddress = "上海市浦东新区 · 09:00-18:00 · 400-888-MODS",
}: PosterOptions): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const width = 1200;
  const height = 1600;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d context");

  // 1. Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#0e111a");
  bgGrad.addColorStop(0.4, "#090a0f");
  bgGrad.addColorStop(1, "#040507");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Background radial glow
  const radialGlow = ctx.createRadialGradient(
    width / 2,
    520,
    50,
    width / 2,
    520,
    550,
  );
  radialGlow.addColorStop(0, "rgba(37, 99, 235, 0.22)");
  radialGlow.addColorStop(0.5, "rgba(30, 58, 138, 0.08)");
  radialGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, width, height);

  // Subtle grid lines
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
  ctx.lineWidth = 1;
  const gridSize = 48;
  for (let x = gridSize; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = gridSize; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // Decorative border frame
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, width - 72, height - 72);
  // Corner accents
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 3;
  const cornerSize = 24;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(36, 36 + cornerSize);
  ctx.lineTo(36, 36);
  ctx.lineTo(36 + cornerSize, 36);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(width - 36 - cornerSize, 36);
  ctx.lineTo(width - 36, 36);
  ctx.lineTo(width - 36, 36 + cornerSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(36, height - 36 - cornerSize);
  ctx.lineTo(36, height - 36);
  ctx.lineTo(36 + cornerSize, height - 36);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(width - 36 - cornerSize, height - 36);
  ctx.lineTo(width - 36, height - 36);
  ctx.lineTo(width - 36, height - 36 - cornerSize);
  ctx.stroke();
  ctx.restore();

  // 2. Header Area
  ctx.save();
  // Brand Tag
  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("CARMOD STUDIO · 3D BUILD SPECIFICATION", 72, 86);

  // Build Tag Badge
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const specCode = "SPEC-#" + dateStr + "-" + config.vehicleId.slice(0, 4).toUpperCase();
  ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
  drawRoundRect(ctx, width - 240, 68, 168, 28, 6);
  ctx.fill();
  ctx.fillStyle = "#60a5fa";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(specCode, width - 240 + 84, 86);
  ctx.textAlign = "left";

  // Vehicle Main Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 40px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(vehicleName, 72, 134);

  // Subtitle
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("个性化外观定制方案 · 实时 3D 渲染与施工报价清单", 72, 160);
  ctx.restore();

  // 3. 3D Car Render Image
  ctx.save();
  const carAreaX = 72;
  const carAreaY = 190;
  const carAreaW = width - 144;
  const carAreaH = 580;

  // Car container box
  ctx.fillStyle = "rgba(15, 18, 28, 0.65)";
  drawRoundRect(ctx, carAreaX, carAreaY, carAreaW, carAreaH, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.stroke();

  // Floor shadow ellipse
  const floorShadow = ctx.createRadialGradient(
    width / 2,
    carAreaY + carAreaH - 70,
    20,
    width / 2,
    carAreaY + carAreaH - 70,
    380,
  );
  floorShadow.addColorStop(0, "rgba(0, 0, 0, 0.85)");
  floorShadow.addColorStop(0.6, "rgba(0, 0, 0, 0.4)");
  floorShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = floorShadow;
  ctx.fillRect(carAreaX, carAreaY + carAreaH - 140, carAreaW, 140);

  // Draw 3D Car canvas with aspect fit
  const cw = carCanvas.width;
  const ch = carCanvas.height;
  const scale = Math.min((carAreaW - 30) / cw, (carAreaH - 40) / ch);
  const dw = cw * scale;
  const dh = ch * scale;
  const dx = carAreaX + (carAreaW - dw) / 2;
  const dy = carAreaY + (carAreaH - dh) / 2;

  ctx.drawImage(carCanvas, 0, 0, cw, ch, dx, dy, dw, dh);

  // 3D Watermark pill
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  drawRoundRect(ctx, carAreaX + 20, carAreaY + carAreaH - 44, 110, 24, 12);
  ctx.fill();
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("3D 实时渲染", carAreaX + 42, carAreaY + carAreaH - 28);
  ctx.restore();

  // 4. Specs Grid (2 columns x 3 rows)
  const gridStartX = 72;
  const gridStartY = 795;
  const cardW = (width - 144 - 24) / 2; // 516px
  const cardH = 110;
  const gapX = 24;
  const gapY = 16;

  const paintTypeName =
    config.paint.type === "wrap"
      ? "高阶定制贴膜"
      : config.paint.type === "matte"
        ? "哑光防刮车漆"
        : config.paint.type === "metallic"
          ? "金属珠光质感"
          : "纯色烤漆";

  const coverageName =
    config.paint.coverage === "full"
      ? "全车施工"
      : config.paint.coverage === "roof"
        ? "车顶部位"
        : "引擎盖部位";

  const specCards = [
    {
      title: "车身改色 / 贴膜",
      en: "PAINT & BODY WRAP",
      value: config.paint.colorName + " · " + paintTypeName,
      sub: "施工范围：" + coverageName + " · 价格倍率 " + config.paint.priceMultiplier + "x",
      colorHex: config.paint.color,
      isPrice: false,
    },
    {
      title: "个性化拉花设计",
      en: "LIVERY & ACCENTS",
      value: config.appearance.liveryName,
      sub: "原厂级高精对位图层 · 耐候抗紫外线",
      colorHex: null,
      isPrice: false,
    },
    {
      title: "运动轮毂配置",
      en: "WHEELS & RIMS",
      value: config.mods.wheelsName,
      sub: "表面涂装：" + config.appearance.wheelColorName,
      colorHex: config.appearance.wheelColor,
      isPrice: false,
    },
    {
      title: "高性能卡钳涂装",
      en: "BRAKE CALIPERS",
      value: config.appearance.caliperColorName + " 耐高温喷涂",
      sub: "赛道级耐热涂料 · 专属运动点缀",
      colorHex: config.appearance.caliperColor,
      isPrice: false,
    },
    {
      title: "空气动力学套件",
      en: "AERODYNAMICS PACKAGE",
      value: config.mods.spoilerName + " / " + config.mods.bodykitName,
      sub: "轻量化气动下压力优化 · 原装位无损安装",
      colorHex: null,
      isPrice: false,
    },
    {
      title: "方案预估总报价",
      en: "ESTIMATED TOTAL BUDGET",
      value: "¥" + quote.total.toLocaleString(),
      sub: "含 " + quote.lines.length + " 项改装项目及专业工时服务",
      colorHex: null,
      isPrice: true,
    },
  ];

  specCards.forEach((card, idx) => {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const cx = gridStartX + col * (cardW + gapX);
    const cy = gridStartY + row * (cardH + gapY);

    ctx.save();
    // Card background
    ctx.fillStyle = card.isPrice
      ? "rgba(30, 58, 138, 0.25)"
      : "rgba(20, 24, 36, 0.75)";
    drawRoundRect(ctx, cx, cy, cardW, cardH, 14);
    ctx.fill();
    ctx.strokeStyle = card.isPrice
      ? "rgba(59, 130, 246, 0.4)"
      : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Card Header EN + ZH
    ctx.fillStyle = card.isPrice ? "#60a5fa" : "#94a3b8";
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(card.title, cx + 18, cy + 28);
    ctx.fillStyle = "#64748b";
    ctx.font = "9px monospace";
    ctx.fillText(card.en, cx + 18, cy + 42);

    // Color swatch indicator if applicable
    if (card.colorHex) {
      ctx.fillStyle = card.colorHex;
      ctx.beginPath();
      ctx.arc(cx + cardW - 28, cy + 30, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Card Value
    if (card.isPrice) {
      ctx.fillStyle = "#38bdf8";
      ctx.font = "900 24px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(card.value, cx + 18, cy + 74);
    } else {
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(card.value, cx + 18, cy + 70);
    }

    // Card Subtext
    ctx.fillStyle = card.isPrice ? "#93c5fd" : "#64748b";
    ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(card.sub, cx + 18, cy + 92);
    ctx.restore();
  });

  // 5. Bottom Verification & Shop Info & QR Code
  const footerY = 1205;
  const footerH = 320;

  ctx.save();
  // Footer container
  ctx.fillStyle = "rgba(15, 18, 28, 0.85)";
  drawRoundRect(ctx, 72, footerY, width - 144, footerH, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.stroke();

  // Left column: Shop and appointment info
  ctx.fillStyle = "#60a5fa";
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("施工与质保认证 · SHOP VERIFICATION", 104, footerY + 45);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(shopName, 104, footerY + 80);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(shopAddress, 104, footerY + 112);

  // Guarantee list
  const perks = [
    "✓ 进口车衣/改色膜 3 年质保",
    "✓ 专业无尘贴膜车间施工",
    "✓ 专属改装清单留档备查",
    "✓ 门店支持预约实车体验",
  ];
  ctx.fillStyle = "#94a3b8";
  ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
  perks.forEach((perk, i) => {
    const px = 104 + (i % 2) * 260;
    const py = footerY + 160 + Math.floor(i / 2) * 28;
    ctx.fillText(perk, px, py);
  });

  // Watermark brand
  ctx.fillStyle = "#475569";
  ctx.font = "12px monospace";
  ctx.fillText(
    "CarMod SaaS Platform · Generated with WebGL 3D Engine",
    104,
    footerY + 280,
  );

  // Right column: QR Code
  const qrX = width - 72 - 200;
  const qrY = footerY + 40;
  const qrSize = 160;

  drawQrToCanvas(ctx, shareUrl, qrX, qrY, qrSize, {
    bgColor: "#ffffff",
    color: "#090a0f",
    padding: 12,
    borderRadius: 12,
  });

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("扫码查看 3D 配置", qrX + qrSize / 2, qrY + qrSize + 28);
  ctx.fillStyle = "#64748b";
  ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("支持手机端 360° 交互", qrX + qrSize / 2, qrY + qrSize + 48);
  ctx.textAlign = "left";

  ctx.restore();

  return canvas;
}