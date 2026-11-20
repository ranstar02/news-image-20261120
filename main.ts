// news-image-20261120 — draws one infographic summing up the world's news of
// Friday 20 November 2026 and writes it to /output/entry.png (or
// $MAKEFUN_OUTPUT_DIR/entry.png). Node standard library only, no network,
// deterministic: two runs write byte-identical files.
// SPDX-License-Identifier: MIT

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

const CREAM: [number, number, number] = [0xf7, 0xf3, 0xe8];
const NAVY: [number, number, number] = [0x16, 0x21, 0x3e];
const GOLD: [number, number, number] = [0xd4, 0xa0, 0x17];
const INK: [number, number, number] = [0x1a, 0x23, 0x40];
const WHITE: [number, number, number] = [0xff, 0xff, 0xff];
const PALE: [number, number, number] = [0xe8, 0xe0, 0xc8]; // pale gold-white
const MUTED: [number, number, number] = [0x5a, 0x62, 0x74]; // grey-navy

function fillRect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      i += 3;
    }
  }
}

function setPixel(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 bits, MSB = leftmost column.
// Written for this entry: A-Z, a-z, 0-9 and .,;:!?'\"-–—/()&%$#@+*= and ·
// ---------------------------------------------------------------------------
type Glyph = [number, number, number, number, number, number, number];

const FONT: Record<string, Glyph> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  a: [0x00, 0x00, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  b: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x1e],
  c: [0x00, 0x00, 0x0e, 0x11, 0x10, 0x11, 0x0e],
  d: [0x01, 0x01, 0x0f, 0x11, 0x11, 0x11, 0x0f],
  e: [0x00, 0x00, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  f: [0x06, 0x09, 0x08, 0x1e, 0x08, 0x08, 0x08],
  g: [0x00, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  h: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x11],
  i: [0x04, 0x00, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  j: [0x02, 0x00, 0x06, 0x02, 0x02, 0x12, 0x0c],
  k: [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
  l: [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  m: [0x00, 0x00, 0x1a, 0x15, 0x15, 0x15, 0x15],
  n: [0x00, 0x00, 0x1e, 0x11, 0x11, 0x11, 0x11],
  o: [0x00, 0x00, 0x0e, 0x11, 0x11, 0x11, 0x0e],
  p: [0x00, 0x00, 0x1e, 0x11, 0x11, 0x1e, 0x10],
  q: [0x00, 0x00, 0x0f, 0x11, 0x11, 0x0f, 0x01],
  r: [0x00, 0x00, 0x16, 0x19, 0x10, 0x10, 0x10],
  s: [0x00, 0x00, 0x0f, 0x10, 0x0e, 0x01, 0x1e],
  t: [0x08, 0x08, 0x1e, 0x08, 0x08, 0x08, 0x06],
  u: [0x00, 0x00, 0x11, 0x11, 0x11, 0x13, 0x0d],
  v: [0x00, 0x00, 0x11, 0x11, 0x11, 0x0a, 0x04],
  w: [0x00, 0x00, 0x11, 0x11, 0x15, 0x15, 0x0a],
  x: [0x00, 0x00, 0x11, 0x0a, 0x04, 0x0a, 0x11],
  y: [0x00, 0x00, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  z: [0x00, 0x00, 0x1f, 0x02, 0x04, 0x08, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  ",": [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x04],
  ";": [0x00, 0x0c, 0x00, 0x00, 0x00, 0x0c, 0x04],
  ":": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  "'": [0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00],
  '"': [0x0a, 0x0a, 0x0a, 0x00, 0x00, 0x00, 0x00],
  "-": [0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00],
  "–": [0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00],
  "—": [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "@": [0x0e, 0x11, 0x17, 0x15, 0x16, 0x10, 0x0e],
  "+": [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  "*": [0x00, 0x04, 0x15, 0x0e, 0x15, 0x04, 0x00],
  "=": [0x00, 0x00, 0x1f, 0x00, 0x1f, 0x00, 0x00],
  "·": [0x00, 0x00, 0x00, 0x0c, 0x0c, 0x00, 0x00],
  " ": [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
};

function glyphOf(ch: string): Glyph {
  return FONT[ch] ?? FONT["?"];
}

// Advance between glyph origins: 5 px of glyph + a small gap that grows
// slightly with scale so large type breathes.
function advance(scale: number): number {
  return 5 * scale + (scale >= 5 ? 2 : 1);
}

function textWidth(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * advance(scale) - (scale >= 5 ? 2 : 1);
}

function drawText(x: number, y: number, text: string, scale: number, c: [number, number, number]): void {
  let cx = x;
  for (const ch of text) {
    const g = glyphOf(ch);
    for (let row = 0; row < 7; row++) {
      const bits = g[row];
      if (bits === 0) continue;
      for (let col = 0; col < 5; col++) {
        if (bits & (0x10 >> col)) {
          fillRect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += advance(scale);
  }
}

function drawTextCentered(y: number, text: string, scale: number, c: [number, number, number]): void {
  drawText(Math.round((W - textWidth(text, scale)) / 2), y, text, scale, c);
}

// Word-wrap a string into at most `maxLines` lines fitting `maxWidth` px.
function wrapText(text: string, scale: number, maxWidth: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur === "" ? w : cur + " " + w;
    if (textWidth(next, scale) <= maxWidth) {
      cur = next;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines.slice(0, maxLines);
}

// ---------------------------------------------------------------------------
// The 7 stories of Friday 20 November 2026 (data from the brief, verbatim)
// ---------------------------------------------------------------------------
type Story = {
  chip: string;
  chipColor: [number, number, number];
  headline: string;
  summary: string;
};

const STORIES: Story[] = [
  { chip: "IRAN", chipColor: [0xc0, 0x39, 0x2b], headline: "Trump delays Iran decision", summary: "No war call until 2027, he says; 'see what happens'." },
  { chip: "UKRAINE", chipColor: [0xe6, 0xa8, 0x17], headline: "Explosions heard across Kyiv", summary: "Blasts at dawn as Russia keeps up its drone assault." },
  { chip: "EUROPE", chipColor: [0x1f, 0x5f, 0xb0], headline: "Europe open to Russia talks", summary: "Leaders say they are ready to negotiate an end to war." },
  { chip: "CYCLONE", chipColor: [0x0e, 0x7c, 0x7b], headline: "Cyclone Akvan slams Odisha", summary: "300,000 evacuated as the storm makes landfall today." },
  { chip: "SPACE", chipColor: [0x6c, 0x3f, 0xa8], headline: "Voyager 1 a light-day away", summary: "NASA marks a milestone for its farthest spacecraft." },
  { chip: "SPACE", chipColor: [0x3d, 0x6e, 0xa8], headline: "Hayabusa2 scraps asteroid bid", summary: "Engine trouble ends Japan's planned landing attempt." },
  { chip: "GAMING", chipColor: [0xd9, 0x6c, 0x1e], headline: "GTA 6 outsells The Odyssey", summary: "Sales pass $1.8bn, beating the year's biggest film." },
];

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const HEADER_H = 160;
const GOLD_RULE_H = 6;
const MARGIN = 24;
const CARD_W = W - MARGIN * 2; // 976
const CARD_H = 100;
const CARD_GAP = 10;
const ROWS_TOP = HEADER_H + GOLD_RULE_H + 16; // 182

function drawChip(x: number, y: number, label: string, c: [number, number, number]): number {
  const padX = 8;
  const padY = 3;
  const tw = textWidth(label, 2);
  const w = tw + padX * 2;
  const h = 7 * 2 + padY * 2; // 20
  fillRect(x, y, w, h, c);
  drawText(x + padX, y + padY, label, 2, WHITE);
  return w;
}

function drawCard(y: number, s: Story): void {
  fillRect(MARGIN, y, CARD_W, CARD_H, WHITE);
  // coloured left accent bar
  fillRect(MARGIN, y, 10, CARD_H, s.chipColor);
  // thin bottom divider for definition
  fillRect(MARGIN, y + CARD_H - 2, CARD_W, 2, [0xe3, 0xdd, 0xcc]);
  const contentX = MARGIN + 10 + 14; // 48
  // line 1: chip + headline (headline scale 5, height 35)
  const chipW = drawChip(contentX, y + 14, s.chip, s.chipColor);
  drawText(contentX + chipW + 14, y + 12, s.headline, 5, INK);
  // summary: up to two lines, scale 3
  const maxSummaryW = MARGIN + CARD_W - 16 - contentX;
  const lines = wrapText(s.summary, 3, maxSummaryW, 2);
  for (let i = 0; i < lines.length; i++) {
    drawText(contentX, y + 58 + i * 24, lines[i], 3, MUTED);
  }
}

function drawImage(): void {
  // cream background
  fillRect(0, 0, W, H, CREAM);
  // navy header band + gold rule
  fillRect(0, 0, W, HEADER_H, NAVY);
  fillRect(0, HEADER_H, W, GOLD_RULE_H, GOLD);
  drawTextCentered(20, "THE WORLD IN ONE IMAGE", 2, GOLD);
  drawTextCentered(46, "FRIDAY, 20 NOVEMBER 2026", 6, WHITE);
  drawTextCentered(102, "Seven stories that defined the day", 3, PALE);
  // story cards
  for (let i = 0; i < STORIES.length; i++) {
    drawCard(ROWS_TOP + i * (CARD_H + CARD_GAP), STORIES[i]);
  }
  // footer
  drawTextCentered(956, "Sources: Reuters · AP · BBC · The Independent — 20 Nov 2026", 2, INK);
  drawTextCentered(978, "make.fun · news-image-20261120", 2, MUTED);
}

// ---------------------------------------------------------------------------
// Font test image (FONT_TEST=1): every glyph at scale 4, in labelled rows,
// so each glyph can be inspected visually.
// ---------------------------------------------------------------------------
function drawFontTest(): void {
  fillRect(0, 0, W, H, CREAM);
  drawTextCentered(16, "FONT TEST — 5x7 BITMAP FONT", 3, INK);
  const rows: Array<[string, string]> = [
    ["UPPER", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
    ["lower", "abcdefghijklmnopqrstuvwxyz"],
    ["digits", "0123456789"],
    ["punct1", ".,;:!?'\"-"],
    ["punct2", "–—/()&%$#@+*="],
    ["middle", "·"],
  ];
  let y = 70;
  for (const [label, chars] of rows) {
    drawText(24, y + 6, label, 2, MUTED);
    drawText(140, y, chars, 4, INK);
    y += 56;
  }
  // every glyph again at scale 6, one per cell, for close inspection
  const all = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?'\"–—/()&%$#@+*=·";
  drawText(24, y + 10, "scale 6:", 2, MUTED);
  y += 44;
  let x = 24;
  for (const ch of all) {
    drawText(x, y, ch, 6, INK);
    x += advance(6);
    if (x > W - 60) {
      x = 24;
      y += 48;
    }
  }
}

// ---------------------------------------------------------------------------
// PNG encoder: pure JS, Node zlib DEFLATE, own CRC32. No timestamps, fixed
// chunk order (IHDR, IDAT, IEND) so output is deterministic.
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  // raw scanlines: filter byte 0 + RGB rows
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const src = y * W * 3;
    const dst = y * (1 + W * 3);
    raw[dst] = 0;
    raw.set(px.subarray(src, src + W * 3), dst + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
if (process.env.FONT_TEST === "1") {
  drawFontTest();
  writeFileSync(`${outDir}/font-test.png`, encodePNG());
} else {
  drawImage();
  writeFileSync(`${outDir}/entry.png`, encodePNG());
}
