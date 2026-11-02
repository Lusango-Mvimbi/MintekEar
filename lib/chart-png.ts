import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

/**
 * Analysis charts as SVG, rasterised with resvg and the bundled Inter font.
 * The pictures are real drawings. Score mix is not one of them.
 */

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

export type OverviewCard = {
  label: string;
  value: string;
  caption: string;
  /** Accent for the card rule and the figure. */
  color: string;
};

export type OverviewSpec = {
  title: string;
  subtitle: string;
  cards: OverviewCard[];
};

const require = createRequire(import.meta.url);
const { Resvg } = require("@resvg/resvg-js") as typeof import("@resvg/resvg-js");

const WIDTH = 1200;
const PAD = 40;
const ZOOM = 2;

const INK = "#00131d";
const MUTED = "#5e828d";
const ACCENT = "#194d5c";
const BRAND = "#d22d20";
const PAPER = "#f3f6f7";
const LINE = "#e3eaeb";
const WHITE = "#ffffff";
const GOOD = "#0f8a4b";
const GOOD_BG = "#e7f6ee";

let regularFont = "";
let boldFont = "";

function fontFile(file: string): string {
  const candidates = [
    path.join(process.cwd(), "assets", "fonts", file),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "fonts", file),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Chart font is missing: assets/fonts/${file}`);
}

function fonts(): { regular: string; bold: string } {
  if (!regularFont) regularFont = fontFile("Inter-Regular.ttf");
  if (!boldFont) boldFont = fontFile("Inter-Bold.ttf");
  return { regular: regularFont, bold: boldFont };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text: string, maxChars: number, maxLines = 3): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const head = lines.slice(0, maxLines - 1);
  let rest = lines.slice(maxLines - 1).join(" ");
  if (rest.length > maxChars) rest = `${rest.slice(0, Math.max(0, maxChars - 1))}…`;
  return [...head, rest];
}

function text(
  x: number,
  y: number,
  value: string,
  options: { size: number; fill: string; weight?: number; anchor?: "start" | "end" },
): string {
  const anchor = options.anchor ?? "start";
  const weight = options.weight ?? 400;
  return `<text x="${x}" y="${y}" font-family="Inter" font-size="${options.size}" font-weight="${weight}" fill="${options.fill}" text-anchor="${anchor}" dominant-baseline="hanging">${escapeXml(value)}</text>`;
}

function frame(height: number): string {
  return `<rect width="${WIDTH}" height="${height}" fill="${WHITE}"/><rect width="${WIDTH}" height="6" fill="${ACCENT}"/><rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" fill="none" stroke="${LINE}"/>`;
}

function raster(svg: string, logicalHeight: number): { png: Buffer; width: number; height: number } {
  const { regular, bold } = fonts();
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: ZOOM },
    font: {
      fontFiles: [regular, bold],
      loadSystemFonts: false,
      defaultFontFamily: "Inter",
    },
    background: WHITE,
  });
  const rendered = resvg.render();
  const png = Buffer.from(rendered.asPng());
  return { png, width: rendered.width, height: rendered.height || logicalHeight * ZOOM };
}

function heading(title: string, subtitle: string, y: number): { svg: string; next: number } {
  const titleLines = wrapText(title, 48, 2);
  const subtitleLines = wrapText(subtitle, 92, 3);
  const parts = [text(PAD, y, "MintekEar", { size: 13, fill: BRAND, weight: 700 })];
  let cursor = y + 22;
  for (const line of titleLines) {
    parts.push(text(PAD, cursor, line, { size: 26, fill: ACCENT, weight: 700 }));
    cursor += 34;
  }
  cursor += 2;
  for (const line of subtitleLines) {
    parts.push(text(PAD, cursor, line, { size: 15, fill: MUTED }));
    cursor += 22;
  }
  return { svg: parts.join(""), next: cursor + 8 };
}

export function renderBarChart(spec: BarChartSpec): { png: Buffer; width: number; height: number } {
  const trackX = PAD;
  const trackW = WIDTH - PAD * 2;
  const head = heading(spec.title, spec.subtitle, 28);
  let cursor = head.next + 12;
  const chunks: string[] = [head.svg];

  if (spec.bars.length === 0) {
    const tone = spec.emptyTone === "good" ? GOOD : MUTED;
    const background = spec.emptyTone === "good" ? GOOD_BG : PAPER;
    const lines = wrapText(spec.empty, 80, 2);
    const boxH = 28 + lines.length * 22;
    chunks.push(`<rect x="${PAD}" y="${cursor}" width="${trackW}" height="${boxH}" rx="14" fill="${background}"/>`);
    lines.forEach((line, index) => {
      chunks.push(text(PAD + 18, cursor + 14 + index * 22, line, { size: 15, fill: tone, weight: 700 }));
    });
    cursor += boxH;
  } else {
    for (const bar of spec.bars) {
      chunks.push(text(trackX, cursor, bar.label, { size: 15, fill: INK, weight: 700 }));
      chunks.push(text(WIDTH - PAD, cursor, bar.valueLabel, { size: 15, fill: INK, weight: 700, anchor: "end" }));
      const barY = cursor + 24;
      const fraction = Math.min(1, Math.max(0, bar.fraction));
      chunks.push(`<rect x="${trackX}" y="${barY}" width="${trackW}" height="12" rx="6" fill="${PAPER}"/>`);
      if (fraction > 0) {
        const fill = Math.min(trackW, Math.max(12, Math.round(trackW * fraction)));
        const radius = Math.min(6, fill / 2);
        chunks.push(
          `<rect x="${trackX}" y="${barY}" width="${fill}" height="12" rx="${radius}" fill="${escapeXml(bar.color)}"/>`,
        );
      }
      cursor = barY + 28;
    }
    if (spec.axisLow || spec.axisHigh) {
      if (spec.axisLow) chunks.push(text(trackX, cursor, spec.axisLow, { size: 12, fill: MUTED, weight: 700 }));
      if (spec.axisHigh) {
        chunks.push(text(WIDTH - PAD, cursor, spec.axisHigh, { size: 12, fill: MUTED, weight: 700, anchor: "end" }));
      }
      cursor += 18;
    }
  }

  const height = cursor + 28;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">${frame(height)}${chunks.join("")}</svg>`;
  return raster(svg, height);
}

export function renderOverviewChart(spec: OverviewSpec): { png: Buffer; width: number; height: number } {
  const head = heading(spec.title, spec.subtitle, 28);
  const gap = 16;
  const cards = spec.cards.slice(0, 3);
  const cardW = (WIDTH - PAD * 2 - gap * Math.max(0, cards.length - 1)) / Math.max(1, cards.length);
  const cardH = 168;
  const cardY = head.next + 12;
  const chunks = [head.svg];

  cards.forEach((card, index) => {
    const x = PAD + index * (cardW + gap);
    const clip = `card${index}`;
    chunks.push(
      `<clipPath id="${clip}"><rect x="${x}" y="${cardY}" width="${cardW}" height="${cardH}" rx="16"/></clipPath>`,
      `<g clip-path="url(#${clip})">`,
      `<rect x="${x}" y="${cardY}" width="${cardW}" height="${cardH}" fill="${WHITE}"/>`,
      `<rect x="${x}" y="${cardY}" width="${cardW}" height="6" fill="${escapeXml(card.color)}"/>`,
      text(x + 22, cardY + 24, card.label.toUpperCase(), { size: 12, fill: MUTED, weight: 700 }),
      text(x + 22, cardY + 52, card.value, { size: 42, fill: card.color, weight: 700 }),
      text(x + 22, cardY + 118, card.caption, { size: 14, fill: MUTED }),
      `</g>`,
      `<rect x="${x}" y="${cardY}" width="${cardW}" height="${cardH}" rx="16" fill="none" stroke="${LINE}"/>`,
    );
  });

  const height = cardY + cardH + 32;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">${frame(height)}${chunks.join("")}</svg>`;
  return raster(svg, height);
}

export function pngDimensions(png: Buffer): { width: number; height: number } {
  if (png.length < 24 || png.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("Not a PNG.");
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function parseHex(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return [0, 0, 0];
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDelta = Math.abs(estimate - left);
  const upDelta = Math.abs(estimate - up);
  const diag = Math.abs(estimate - upLeft);
  if (leftDelta <= upDelta && leftDelta <= diag) return left;
  if (upDelta <= diag) return up;
  return upLeft;
}

/** True when a flat fill of that colour survives in the PNG (edges may be antialiased). */
export function pngContainsColor(png: Buffer, hex: string): boolean {
  const [wantR, wantG, wantB] = parseHex(hex);
  const { width, height } = pngDimensions(png);
  const colorType = png[25];
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (channels === 0) return false;

  const idat: Buffer[] = [];
  let offset = 8;
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "IDAT") idat.push(png.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
    if (type === "IEND") break;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows: Buffer[] = [];
  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    const row = Buffer.from(raw.subarray(cursor + 1, cursor + 1 + stride));
    const previous = rows[y - 1];
    if (filter === 1 || filter === 3 || filter === 4) {
      for (let i = 0; i < row.length; i += 1) {
        const left = i >= channels ? row[i - channels] : 0;
        if (filter === 1) row[i] = (row[i] + left) & 255;
        else if (filter === 3) {
          const up = previous ? previous[i] : 0;
          row[i] = (row[i] + Math.floor((left + up) / 2)) & 255;
        } else {
          const up = previous ? previous[i] : 0;
          const upLeft = previous && i >= channels ? previous[i - channels] : 0;
          row[i] = (row[i] + paeth(left, up, upLeft)) & 255;
        }
      }
    } else if (filter === 2 && previous) {
      for (let i = 0; i < row.length; i += 1) row[i] = (row[i] + previous[i]) & 255;
    }
    rows.push(row);
    cursor += stride + 1;
  }

  for (const row of rows) {
    for (let i = 0; i < row.length; i += channels) {
      if (row[i] === wantR && row[i + 1] === wantG && row[i + 2] === wantB) return true;
    }
  }
  return false;
}
