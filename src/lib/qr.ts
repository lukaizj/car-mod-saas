// Standalone ISO/IEC 18004 compliant Byte Mode QR Code Generator (Versions 1-20)

class QRBitBuffer {
  buffer: number[] = [];
  length = 0;

  put(num: number, length: number) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) this.buffer.push(0);
    if (bit) this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    this.length++;
  }
}

const QRMath = {
  glog(n: number): number {
    if (n < 1) return 0;
    return QRMath.LOG_TABLE[n] ?? 0;
  },
  gexp(n: number): number {
    let val = n;
    while (val < 0) val += 255;
    while (val >= 255) val -= 255;
    return QRMath.EXP_TABLE[val] ?? 0;
  },
  EXP_TABLE: new Array<number>(256),
  LOG_TABLE: new Array<number>(256),
};

for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
for (let i = 8; i < 256; i++) {
  QRMath.EXP_TABLE[i] =
    (QRMath.EXP_TABLE[i - 4] ?? 0) ^
    (QRMath.EXP_TABLE[i - 5] ?? 0) ^
    (QRMath.EXP_TABLE[i - 6] ?? 0) ^
    (QRMath.EXP_TABLE[i - 8] ?? 0);
}
for (let i = 0; i < 255; i++) {
  const expVal = QRMath.EXP_TABLE[i];
  if (expVal !== undefined) {
    QRMath.LOG_TABLE[expVal] = i;
  }
}

class QRPolynomial {
  num: number[];

  constructor(num: number[], shift = 0) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset] ?? 0;
    for (let i = num.length - offset; i < this.num.length; i++) this.num[i] = 0;
  }

  get(index: number): number {
    return this.num[index] ?? 0;
  }

  getLength(): number {
    return this.num.length;
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array<number>(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] =
          (num[i + j] ?? 0) ^
          QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }
    return new QRPolynomial(num);
  }

  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) return this;
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array<number>(this.getLength());
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (let i = 0; i < e.getLength(); i++) {
      num[i] = (num[i] ?? 0) ^ QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num).mod(e);
  }
}

// ISO 18004 Table 7 & 9 for ECC Level M: [version, totalCodewords, dataCodewords, ecPerBlock, g1Blocks, g1DataCount, g2Blocks, g2DataCount]
const RS_TABLE_M: [number, number, number, number, number, number, number, number][] = [
  [1, 26, 16, 10, 1, 16, 0, 0],
  [2, 44, 28, 16, 1, 28, 0, 0],
  [3, 70, 44, 26, 1, 44, 0, 0],
  [4, 100, 64, 18, 2, 32, 0, 0],
  [5, 134, 86, 24, 2, 43, 0, 0],
  [6, 172, 108, 16, 4, 27, 0, 0],
  [7, 196, 124, 18, 4, 31, 0, 0],
  [8, 242, 154, 22, 2, 38, 2, 39],
  [9, 292, 182, 22, 3, 36, 2, 37],
  [10, 346, 216, 26, 4, 43, 1, 44],
  [11, 404, 252, 30, 1, 50, 4, 51],
  [12, 466, 290, 22, 6, 36, 2, 37],
  [13, 532, 332, 22, 8, 37, 4, 38],
  [14, 581, 363, 24, 4, 40, 5, 41],
  [15, 655, 415, 24, 5, 41, 5, 42],
  [16, 733, 467, 28, 7, 45, 3, 46],
  [17, 815, 521, 28, 10, 46, 1, 47],
  [18, 901, 577, 26, 9, 43, 4, 44],
  [19, 991, 637, 26, 3, 44, 11, 45],
  [20, 1085, 701, 26, 3, 41, 13, 42],
];

const ALIGNMENT_PATTERN_TABLE: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
];

function getVersionInfoBits(version: number): number {
  if (version < 7) return 0;
  let d = version << 12;
  while (d >= (1 << 12)) {
    const shift = Math.floor(Math.log2(d)) - 12;
    d ^= (0x1f25 << shift);
  }
  return (version << 12) | d;
}

class QRCode {
  typeNumber: number;
  moduleCount: number;
  modules: (boolean | null)[][];

  constructor(typeNumber: number) {
    this.typeNumber = typeNumber;
    this.moduleCount = typeNumber * 4 + 17;
    this.modules = Array.from({ length: this.moduleCount }, () =>
      new Array<boolean | null>(this.moduleCount).fill(null),
    );
  }

  make(data: number[]) {
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupTimingPattern();
    this.setupPositionAdjustPattern();
    this.setupTypeInfo();
    this.setupVersionInfo();
    this.mapData(data);
  }

  private setupPositionProbePattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r]![col + c] = true;
        } else {
          this.modules[row + r]![col + c] = false;
        }
      }
    }
  }

  private setupTimingPattern() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r]![6] === null) this.modules[r]![6] = r % 2 === 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6]![c] === null) this.modules[6]![c] = c % 2 === 0;
    }
  }

  private setupPositionAdjustPattern() {
    const pos = ALIGNMENT_PATTERN_TABLE[this.typeNumber - 1];
    if (!pos || pos.length === 0) return;
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i]!;
        const col = pos[j]!;
        if (this.modules[row]![col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (
              r === -2 ||
              r === 2 ||
              c === -2 ||
              c === 2 ||
              (r === 0 && c === 0)
            ) {
              this.modules[row + r]![col + c] = true;
            } else {
              this.modules[row + r]![col + c] = false;
            }
          }
        }
      }
    }
  }

  private setupTypeInfo() {
    const bits = 0x5412; // Formatted for ECC M, mask pattern 0
    for (let i = 0; i < 15; i++) {
      const mod = ((bits >> i) & 1) === 1;
      if (i < 6) this.modules[i]![8] = mod;
      else if (i < 8) this.modules[i + 1]![8] = mod;
      else this.modules[this.moduleCount - 15 + i]![8] = mod;

      if (i < 8) this.modules[8]![this.moduleCount - i - 1] = mod;
      else if (i < 9) this.modules[8]![15 - i - 1 + 1] = mod;
      else this.modules[8]![15 - i - 1] = mod;
    }
    this.modules[this.moduleCount - 8]![8] = true;
  }

  private setupVersionInfo() {
    if (this.typeNumber < 7) return;
    const bits = getVersionInfoBits(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = ((bits >> i) & 1) === 1;
      // Top-right
      this.modules[Math.floor(i / 3)]![this.moduleCount - 11 + (i % 3)] = mod;
      // Bottom-left
      this.modules[this.moduleCount - 11 + (i % 3)]![Math.floor(i / 3)] = mod;
    }
  }

  private mapData(data: number[]) {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row]![col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = (((data[byteIndex] ?? 0) >>> bitIndex) & 1) === 1;
            }
            const mask = (row + col - c) % 2 === 0;
            if (mask) dark = !dark;
            this.modules[row]![col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }
}

export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  let version = 1;
  while (version <= 20) {
    const row = RS_TABLE_M[version - 1];
    if (row && bytes.length + 3 <= row[2]) break;
    version++;
  }
  if (version > 20) version = 20;

  const row = RS_TABLE_M[version - 1] ?? RS_TABLE_M[0]!;
  const dataCodewords = row[2];
  const ecPerBlock = row[3];
  const g1Blocks = row[4];
  const g1DataCount = row[5];
  const g2Blocks = row[6];
  const g2DataCount = row[7];

  const buffer = new QRBitBuffer();
  buffer.put(4, 4); // Byte mode indicator (0100)
  buffer.put(bytes.length, version < 10 ? 8 : 16);
  for (let i = 0; i < bytes.length; i++) buffer.put(bytes[i] ?? 0, 8);

  while (buffer.length % 8 !== 0) buffer.putBit(false);

  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (buffer.buffer.length < dataCodewords) {
    buffer.buffer.push(padBytes[padIndex % 2] ?? 0);
    padIndex++;
  }

  // Split into RS blocks
  const blocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < g1Blocks; i++) {
    blocks.push(buffer.buffer.slice(offset, offset + g1DataCount));
    offset += g1DataCount;
  }
  for (let i = 0; i < g2Blocks; i++) {
    blocks.push(buffer.buffer.slice(offset, offset + g2DataCount));
    offset += g2DataCount;
  }

  // Compute EC for each block
  let errorPoly = new QRPolynomial([1]);
  for (let i = 0; i < ecPerBlock; i++) {
    errorPoly = errorPoly.multiply(new QRPolynomial([1, QRMath.gexp(i)]));
  }

  const ecBlocks: number[][] = [];
  for (const block of blocks) {
    const rawPoly = new QRPolynomial(block, errorPoly.getLength() - 1);
    const modPoly = rawPoly.mod(errorPoly);
    const ecData = new Array<number>(errorPoly.getLength() - 1).fill(0);
    for (let i = 0; i < ecData.length; i++) {
      const modIndex = i + modPoly.getLength() - ecData.length;
      ecData[i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
    }
    ecBlocks.push(ecData);
  }

  // Interleave data codewords
  const finalData: number[] = [];
  const maxDataLen = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < blocks.length; b++) {
      const blk = blocks[b]!;
      if (i < blk.length) finalData.push(blk[i] ?? 0);
    }
  }

  // Interleave EC codewords
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < ecBlocks.length; b++) {
      const blk = ecBlocks[b]!;
      if (i < blk.length) finalData.push(blk[i] ?? 0);
    }
  }

  const qr = new QRCode(version);
  qr.make(finalData);

  return qr.modules.map((r) => r.map((cell) => cell === true));
}

export function drawQrToCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  options: {
    color?: string;
    bgColor?: string;
    padding?: number;
    borderRadius?: number;
  } = {},
) {
  const {
    color = "#ffffff",
    bgColor = "rgba(0, 0, 0, 0.75)",
    padding = 8,
    borderRadius = 8,
  } = options;

  const matrix = generateQrMatrix(text);
  const count = matrix.length;
  const qrSize = size - padding * 2;
  const cellSize = qrSize / count;

  // Background with fallback for roundRect
  ctx.save();
  ctx.fillStyle = bgColor;
  if (borderRadius > 0) {
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, borderRadius);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + borderRadius, y);
      ctx.lineTo(x + size - borderRadius, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + borderRadius);
      ctx.lineTo(x + size, y + size - borderRadius);
      ctx.quadraticCurveTo(x + size, y + size, x + size - borderRadius, y + size);
      ctx.lineTo(x + borderRadius, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - borderRadius);
      ctx.lineTo(x, y + borderRadius);
      ctx.quadraticCurveTo(x, y, x + borderRadius, y);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillRect(x, y, size, size);
  }

  ctx.fillStyle = color;
  const startX = x + padding;
  const startY = y + padding;

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (matrix[r]?.[c]) {
        ctx.fillRect(
          Math.floor(startX + c * cellSize),
          Math.floor(startY + r * cellSize),
          Math.ceil(cellSize),
          Math.ceil(cellSize),
        );
      }
    }
  }
  ctx.restore();
}