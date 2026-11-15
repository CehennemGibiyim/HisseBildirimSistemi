#!/usr/bin/env node
/**
 * PWA simgelerini (192/512 px PNG) bağımlılık olmadan üretir.
 * Çalıştırma: node scripts/gen-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

const BG = [9, 13, 19];
const BARS = [
  { x: 0.16, w: 0.13, y: 0.52, h: 0.3, color: [31, 111, 235] },
  { x: 0.34, w: 0.13, y: 0.4, h: 0.42, color: [31, 111, 235] },
  { x: 0.52, w: 0.13, y: 0.27, h: 0.55, color: [34, 197, 94] },
  { x: 0.7, w: 0.13, y: 0.15, h: 0.67, color: [34, 197, 94] },
];

function render(size) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);

  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      let color = BG;
      for (const bar of BARS) {
        const withinX = x >= bar.x * size && x < (bar.x + bar.w) * size;
        const withinY = y >= bar.y * size && y < (bar.y + bar.h) * size;
        if (withinX && withinY) color = bar.color;
      }
      const offset = y * stride + 1 + x * 4;
      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
      raw[offset + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const output = resolve("public/icons");
await mkdir(output, { recursive: true });
for (const size of [192, 512]) {
  const file = resolve(output, `icon-${size}.png`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, render(size));
  console.log(`[icons] ${file}`);
}
