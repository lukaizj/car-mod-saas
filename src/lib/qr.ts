// Standalone ISO/IEC 18004 compliant Byte Mode QR Code Generator

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

const QR_BLOCK_TABLE: [number, number, number, number][] = [
  [1, 0, 26, 16],
  [2, 0, 44, 28],
  [3, 0, 70, 44],
  [4, 0, 100, 64],
  [5, 0, 134, 86],
  [6, 0, 172, 108],
  [7, 0, 196, 124],
  [8, 0, 242, 154],
  [9, 0, 292, 182],
  [10, 0, 346, 216],
];

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
    if (this.typeNumber < 2) return;
    const pos = [6, this.typeNumber * 4 + 10];
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
            // Mask pattern 0: (row + col) % 2 == 0
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

  let typeNumber = 1;
  while (typeNumber <= 10) {
    const row = QR_BLOCK_TABLE[typeNumber - 1];
    if (row && bytes.length + 3 <= row[3]) break;
    typeNumber++;
  }
  if (typeNumber > 10) typeNumber = 10;

  const row = QR_BLOCK_TABLE[typeNumber - 1] ?? [1, 0, 26, 16];
  const totalCount = row[2];
  const dataCount = row[3];

  const buffer = new QRBitBuffer();
  // 8-bit Byte mode indicator (0100)
  buffer.put(4, 4);
  buffer.put(bytes.length, 8);
  for (let i = 0; i < bytes.length; i++) buffer.put(bytes[i] ?? 0, 8);

  while (buffer.length % 8 !== 0) buffer.putBit(false);

  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (buffer.buffer.length < dataCount) {
    buffer.buffer.push(padBytes[padIndex % 2] ?? 0);
    padIndex++;
  }

  const ecCount = totalCount - dataCount;
  let errorPoly = new QRPolynomial([1]);
  for (let i = 0; i < ecCount; i++) {
    errorPoly = errorPoly.multiply(new QRPolynomial([1, QRMath.gexp(i)]));
  }

  const rawPoly = new QRPolynomial(buffer.buffer, errorPoly.getLength() - 1);
  const modPoly = rawPoly.mod(errorPoly);
  const ecData = new Array<number>(errorPoly.getLength() - 1).fill(0);
  for (let i = 0; i < ecData.length; i++) {
    const modIndex = i + modPoly.getLength() - ecData.length;
    ecData[i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
  }

  const finalData = buffer.buffer.concat(ecData);
  const qr = new QRCode(typeNumber);
  qr.make(finalData);

  return qr.modules.map((row) => row.map((cell) => cell === true));
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

  // Background
  ctx.save();
  ctx.fillStyle = bgColor;
  if (borderRadius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, borderRadius);
    ctx.fill();
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
