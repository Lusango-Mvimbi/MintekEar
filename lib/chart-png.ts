import { deflateSync, inflateSync } from "node:zlib";

/**
 * Small PNG bar charts for the Analysis Excel workbook.
 * Drawn with a built-in bitmap font and Node's zlib. No browser and no native canvas.
 */

export type Rgb = readonly [number, number, number];

export type ChartBar = {
  label: string;
  valueLabel: string;
  /** 0 to 1. Values outside that range are clamped. */
  fraction: number;
  color: string;
};

export type BarChartSpec = {
  title: string;
  subtitle: string;
  bars: ChartBar[];
  empty: string;
  /** Green message when there is nothing under the attention line. */
  emptyTone?: "good" | "neutral";
  axisLow?: string;
  axisHigh?: string;
};

const WHITE: Rgb = [255, 255, 255];
const INK: Rgb = [0, 19, 29];
const MUTED: Rgb = [94, 130, 141];
const ACCENT: Rgb = [25, 77, 92];
const PAPER: Rgb = [243, 246, 247];
const LINE: Rgb = [227, 234, 235];
const GOOD: Rgb = [15, 138, 75];
const GOOD_BG: Rgb = [231, 246, 238];

function g(rows: readonly [string, string, string, string, string, string, string]): string {
  for (const row of rows) {
    if (!/^[01]{5}$/.test(row)) throw new Error(`Bad glyph row: ${row}`);
  }
  return rows.join("");
}

/** 5×7 glyphs, seven rows of five bits, left to right. */
const GLYPHS: Record<string, string> = {
  " ": g(["00000", "00000", "00000", "00000", "00000", "00000", "00000"]),
  "0": g(["01110", "10001", "10011", "10101", "11001", "10001", "01110"]),
  "1": g(["00100", "01100", "00100", "00100", "00100", "00100", "01110"]),
  "2": g(["01110", "10001", "00001", "00010", "00100", "01000", "11111"]),
  "3": g(["11110", "00001", "00001", "01110", "00001", "00001", "11110"]),
  "4": g(["00010", "00110", "01010", "10010", "11111", "00010", "00010"]),
  "5": g(["11111", "10000", "10000", "11110", "00001", "00001", "11110"]),
  "6": g(["01110", "10000", "10000", "11110", "10001", "10001", "01110"]),
  "7": g(["11111", "00001", "00010", "00100", "01000", "01000", "01000"]),
  "8": g(["01110", "10001", "10001", "01110", "10001", "10001", "01110"]),
  "9": g(["01110", "10001", "10001", "01111", "00001", "00001", "01110"]),
  A: g(["01110", "10001", "10001", "11111", "10001", "10001", "10001"]),
  B: g(["11110", "10001", "10001", "11110", "10001", "10001", "11110"]),
  C: g(["01110", "10001", "10000", "10000", "10000", "10001", "01110"]),
  D: g(["11110", "10001", "10001", "10001", "10001", "10001", "11110"]),
  E: g(["11111", "10000", "10000", "11110", "10000", "10000", "11111"]),
  F: g(["11111", "10000", "10000", "11110", "10000", "10000", "10000"]),
  G: g(["01110", "10001", "10000", "10111", "10001", "10001", "01111"]),
  H: g(["10001", "10001", "10001", "11111", "10001", "10001", "10001"]),
  I: g(["01110", "00100", "00100", "00100", "00100", "00100", "01110"]),
  J: g(["00111", "00010", "00010", "00010", "00010", "10010", "01100"]),
  K: g(["10001", "10010", "10100", "11000", "10100", "10010", "10001"]),
  L: g(["10000", "10000", "10000", "10000", "10000", "10000", "11111"]),
  M: g(["10001", "11011", "10101", "10101", "10001", "10001", "10001"]),
  N: g(["10001", "11001", "10101", "10011", "10001", "10001", "10001"]),
  O: g(["01110", "10001", "10001", "10001", "10001", "10001", "01110"]),
  P: g(["11110", "10001", "10001", "11110", "10000", "10000", "10000"]),
  Q: g(["01110", "10001", "10001", "10001", "10101", "10010", "01101"]),
  R: g(["11110", "10001", "10001", "11110", "10100", "10010", "10001"]),
  S: g(["01111", "10000", "10000", "01110", "00001", "00001", "11110"]),
  T: g(["11111", "00100", "00100", "00100", "00100", "00100", "00100"]),
  U: g(["10001", "10001", "10001", "10001", "10001", "10001", "01110"]),
  V: g(["10001", "10001", "10001", "10001", "10001", "01010", "00100"]),
  W: g(["10001", "10001", "10001", "10101", "10101", "10101", "01010"]),
  X: g(["10001", "10001", "01010", "00100", "01010", "10001", "10001"]),
  Y: g(["10001", "10001", "01010", "00100", "00100", "00100", "00100"]),
  Z: g(["11111", "00001", "00010", "00100", "01000", "10000", "11111"]),
  a: g(["00000", "00000", "01110", "00001", "01111", "10001", "01111"]),
  b: g(["10000", "10000", "11110", "10001", "10001", "10001", "11110"]),
  c: g(["00000", "00000", "01110", "10000", "10000", "10001", "01110"]),
  d: g(["00001", "00001", "01111", "10001", "10001", "10001", "01111"]),
  e: g(["00000", "00000", "01110", "10001", "11111", "10000", "01110"]),
  f: g(["00110", "01001", "01000", "11100", "01000", "01000", "01000"]),
  g: g(["00000", "01111", "10001", "10001", "01111", "00001", "01110"]),
  h: g(["10000", "10000", "11110", "10001", "10001", "10001", "10001"]),
  i: g(["00100", "00000", "01100", "00100", "00100", "00100", "01110"]),
  j: g(["00010", "00000", "00110", "00010", "00010", "10010", "01100"]),
  k: g(["10000", "10000", "10010", "10100", "11000", "10100", "10010"]),
  l: g(["01100", "00100", "00100", "00100", "00100", "00100", "01110"]),
  m: g(["00000", "00000", "11010", "10101", "10101", "10001", "10001"]),
  n: g(["00000", "00000", "11110", "10001", "10001", "10001", "10001"]),
  o: g(["00000", "00000", "01110", "10001", "10001", "10001", "01110"]),
  p: g(["00000", "11110", "10001", "10001", "11110", "10000", "10000"]),
  q: g(["00000", "01111", "10001", "10001", "01111", "00001", "00001"]),
  r: g(["00000", "00000", "10110", "11001", "10000", "10000", "10000"]),
  s: g(["00000", "00000", "01111", "10000", "01110", "00001", "11110"]),
  t: g(["01000", "01000", "11100", "01000", "01000", "01001", "00110"]),
  u: g(["00000", "00000", "10001", "10001", "10001", "10011", "01101"]),
  v: g(["00000", "00000", "10001", "10001", "10001", "01010", "00100"]),
  w: g(["00000", "00000", "10001", "10101", "10101", "10101", "01010"]),
  x: g(["00000", "00000", "10001", "01010", "00100", "01010", "10001"]),
  y: g(["00000", "10001", "10001", "01111", "00001", "00001", "01110"]),
  z: g(["00000", "00000", "11111", "00010", "00100", "01000", "11111"]),
  ".": g(["00000", "00000", "00000", "00000", "00000", "01100", "01100"]),
  ",": g(["00000", "00000", "00000", "00000", "00100", "00100", "01000"]),
  "-": g(["00000", "00000", "00000", "11111", "00000", "00000", "00000"]),
  "&": g(["01100", "10010", "10100", "01000", "10101", "10010", "01101"]),
  "'": g(["00100", "00100", "01000", "00000", "00000", "00000", "00000"]),
  "/": g(["00001", "00010", "00010", "00100", "01000", "01000", "10000"]),
  ":": g(["00000", "01100", "01100", "00000", "01100", "01100", "00000"]),
  "+": g(["00000", "00100", "00100", "11111", "00100", "00100", "00000"]),
  "(": g(["00010", "00100", "01000", "01000", "01000", "00100", "00010"]),
  ")": g(["01000", "00100", "00010", "00010", "00010", "00100", "01000"]),
  "?": g(["01110", "10001", "00001", "00010", "00100", "00000", "00100"]),
  "·": g(["00000", "00000", "00000", "00100", "00000", "00000", "00000"]),
};

const ADVANCE_UNITS = 6;

export function missingGlyphs(text: string): string[] {
  const missing: string[] = [];
  for (const ch of text) {
    if (!GLYPHS[ch] && !missing.includes(ch)) missing.push(ch);
  }
  return missing;
}

function parseHex(hex: string): Rgb {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return INK;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function advance(scale: number): number {
  return ADVANCE_UNITS * scale;
}

function measure(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * advance(scale) - scale;
}

function fit(text: string, maxWidth: number, scale: number): string {
  if (measure(text, scale) <= maxWidth) return text;
  const ellipsis = "..";
  let kept = text;
  while (kept.length > 0 && measure(`${kept}${ellipsis}`, scale) > maxWidth) {
    kept = kept.slice(0, -1);
  }
  return kept.length > 0 ? `${kept}${ellipsis}` : ellipsis;
}

function wrap(text: string, maxWidth: number, scale: number, maxLines = 2): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const piece = measure(word, scale) <= maxWidth ? word : fit(word, maxWidth, scale);
    const next = current ? `${current} ${piece}` : piece;
    if (measure(next, scale) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = piece;
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const head = lines.slice(0, maxLines - 1);
  const rest = fit(lines.slice(maxLines - 1).join(" "), maxWidth, scale);
  return [...head, rest];
}

class Canvas {
  readonly width: number;
  readonly height: number;
  private readonly pixels: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 3);
    this.pixels.fill(255);
  }

  fill(color: Rgb) {
    for (let i = 0; i < this.pixels.length; i += 3) {
      this.pixels[i] = color[0];
      this.pixels[i + 1] = color[1];
      this.pixels[i + 2] = color[2];
    }
  }

  private plot(x: number, y: number, color: Rgb) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const index = (y * this.width + x) * 3;
    this.pixels[index] = color[0];
    this.pixels[index + 1] = color[1];
    this.pixels[index + 2] = color[2];
  }

  rect(x: number, y: number, w: number, h: number, color: Rgb) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));
    for (let py = y0; py < y1; py += 1) {
      for (let px = x0; px < x1; px += 1) this.plot(px, py, color);
    }
  }

  roundRect(x: number, y: number, w: number, h: number, radius: number, color: Rgb) {
    const width = Math.max(0, Math.floor(w));
    const height = Math.max(0, Math.floor(h));
    const r = Math.max(0, Math.min(Math.floor(radius), Math.floor(width / 2), Math.floor(height / 2)));
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    for (let py = 0; py < height; py += 1) {
      for (let px = 0; px < width; px += 1) {
        if (!inRound(px, py, width, height, r)) continue;
        this.plot(x0 + px, y0 + py, color);
      }
    }
  }

  text(x: number, y: number, text: string, color: Rgb, scale: number) {
    let cursor = Math.floor(x);
    const top = Math.floor(y);
    for (const ch of text) {
      const bits = GLYPHS[ch] ?? GLYPHS["?"];
      for (let row = 0; row < 7; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          if (bits[row * 5 + col] !== "1") continue;
          this.rect(cursor + col * scale, top + row * scale, scale, scale, color);
        }
      }
      cursor += advance(scale);
    }
  }

  png(): Buffer {
    return encodePng(this.width, this.height, this.pixels);
  }
}

function inRound(px: number, py: number, w: number, h: number, r: number): boolean {
  if (r <= 0) return true;
  let cx = -1;
  let cy = -1;
  if (px < r && py < r) {
    cx = r - 1;
    cy = r - 1;
  } else if (px >= w - r && py < r) {
    cx = w - r;
    cy = r - 1;
  } else if (px < r && py >= h - r) {
    cx = r - 1;
    cy = h - r;
  } else if (px >= w - r && py >= h - r) {
    cx = w - r;
    cy = h - r;
  }
  if (cx < 0) return true;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function crc32(buf: Buffer): number {
  let crc = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, crc]);
}

function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const dest = y * (stride + 1);
    raw[dest] = 0;
    for (let x = 0; x < stride; x += 1) raw[dest + 1 + x] = rgb[y * stride + x];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function pngDimensions(png: Buffer): { width: number; height: number } {
  if (png.length < 24 || png.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("Not a PNG.");
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function decodeRgb(png: Buffer): { width: number; height: number; rgb: Buffer } {
  const { width, height } = pngDimensions(png);
  const idat: Buffer[] = [];
  let offset = 8;
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IDAT") idat.push(data);
    offset += 12 + length;
    if (type === "IEND") break;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 3;
  const rgb = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    if (filter !== 0) throw new Error("Unexpected PNG filter.");
    raw.copy(rgb, y * stride, y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
  }
  return { width, height, rgb };
}

export function pngContainsColor(png: Buffer, hex: string): boolean {
  const [r, g, b] = parseHex(hex);
  const { rgb } = decodeRgb(png);
  for (let i = 0; i < rgb.length; i += 3) {
    if (rgb[i] === r && rgb[i + 1] === g && rgb[i + 2] === b) return true;
  }
  return false;
}

const CHART_WIDTH = 960;

export function renderBarChart(spec: BarChartSpec): { png: Buffer; width: number; height: number } {
  const scale = 2;
  const titleScale = 3;
  const pad = 28;
  const lineGap = 4;
  const bodyLine = 7 * scale + lineGap;
  const titleLine = 7 * titleScale + 6;
  const inner = CHART_WIDTH - pad * 2;

  let valueW = 36;
  for (const bar of spec.bars) valueW = Math.max(valueW, measure(bar.valueLabel, scale));
  valueW += 6;
  const minTrack = 180;
  const gaps = 20;
  let labelW = 280;
  let trackW = inner - labelW - valueW - gaps;
  if (trackW < minTrack) {
    labelW = Math.max(150, inner - valueW - gaps - minTrack);
    trackW = inner - labelW - valueW - gaps;
  }

  const titleLines = wrap(spec.title, inner, titleScale, 1);
  const subtitleLines = wrap(spec.subtitle, inner, scale, 3);
  const rows = spec.bars.map((bar) => {
    const lines = wrap(bar.label, labelW, scale, 2);
    const h = Math.max(16, lines.length * bodyLine);
    return { ...bar, lines, h };
  });

  let height = pad + titleLines.length * titleLine + 6 + subtitleLines.length * bodyLine + 18;
  if (rows.length === 0) height += 56;
  else {
    for (const row of rows) height += row.h + 12;
    if (spec.axisLow || spec.axisHigh) height += bodyLine;
  }
  height += pad;

  const canvas = new Canvas(CHART_WIDTH, height);
  canvas.fill(WHITE);
  canvas.rect(0, 0, CHART_WIDTH, 4, ACCENT);

  let y = pad;
  for (const line of titleLines) {
    canvas.text(pad, y, line, ACCENT, titleScale);
    y += titleLine;
  }
  y += 2;
  for (const line of subtitleLines) {
    canvas.text(pad, y, line, MUTED, scale);
    y += bodyLine;
  }
  y += 14;

  if (rows.length === 0) {
    const tone = spec.emptyTone === "good" ? GOOD : MUTED;
    const background = spec.emptyTone === "good" ? GOOD_BG : PAPER;
    canvas.roundRect(pad, y, inner, 44, 12, background);
    const lines = wrap(spec.empty, inner - 28, scale, 2);
    const block = lines.length * bodyLine;
    let textY = y + Math.max(6, Math.floor((44 - block) / 2));
    for (const line of lines) {
      canvas.text(pad + 14, textY, line, tone, scale);
      textY += bodyLine;
    }
  } else {
    const labelX = pad;
    const trackX = pad + labelW + 10;
    const valueX = trackX + trackW + 10;
    for (const row of rows) {
      let textY = y + Math.max(0, Math.floor((row.h - row.lines.length * bodyLine) / 2));
      for (const line of row.lines) {
        canvas.text(labelX, textY, line, INK, scale);
        textY += bodyLine;
      }
      const barY = y + Math.max(0, Math.floor((row.h - 14) / 2));
      canvas.roundRect(trackX, barY, trackW, 14, 7, PAPER);
      const fraction = Math.min(1, Math.max(0, row.fraction));
      if (fraction > 0) {
        const fill = Math.min(trackW, Math.max(8, Math.round(trackW * fraction)));
        canvas.roundRect(trackX, barY, fill, 14, 7, parseHex(row.color));
      }
      const valueWidth = measure(row.valueLabel, scale);
      canvas.text(valueX + Math.max(0, valueW - valueWidth), y + Math.max(0, Math.floor((row.h - bodyLine) / 2)), row.valueLabel, INK, scale);
      y += row.h + 12;
    }
    if (spec.axisLow) canvas.text(trackX, y, spec.axisLow, MUTED, scale);
    if (spec.axisHigh) {
      const highW = measure(spec.axisHigh, scale);
      canvas.text(trackX + trackW - highW, y, spec.axisHigh, MUTED, scale);
    }
  }

  canvas.rect(0, height - 1, CHART_WIDTH, 1, LINE);
  const png = canvas.png();
  return { png, width: CHART_WIDTH, height };
}
