/*
 * Renders the app icon (`assets/icon.svg`) into what Windows needs: `icon.ico` (16–256 px, for
 * the shortcut, the window and the taskbar) and `tray.png` (32 px; Windows scales it for the
 * tray). `npm run desktop:icon` after changing the SVG; the outputs are committed.
 * The ICO holds PNG images, which every Windows since Vista reads.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const dir = join(import.meta.dirname, "assets");
const svg = await loadImage(readFileSync(join(dir, "icon.svg")));
const SIZES = [16, 24, 32, 48, 64, 128, 256];

function render(size) {
  const canvas = createCanvas(size, size);
  canvas.getContext("2d").drawImage(svg, 0, 0, size, size);
  return canvas.toBuffer("image/png");
}
const pngs = SIZES.map(render);

// ICONDIR (6 bytes), one ICONDIRENTRY (16 bytes) per image, then the images
const header = Buffer.alloc(6 + 16 * SIZES.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(SIZES.length, 4);
let offset = header.length;
SIZES.forEach((size, i) => {
  const at = 6 + 16 * i;
  header.writeUInt8(size === 256 ? 0 : size, at); // 0 means 256
  header.writeUInt8(size === 256 ? 0 : size, at + 1);
  header.writeUInt16LE(1, at + 4); // colour planes
  header.writeUInt16LE(32, at + 6); // bits per pixel
  header.writeUInt32LE(pngs[i].length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += pngs[i].length;
});

writeFileSync(join(dir, "icon.ico"), Buffer.concat([header, ...pngs]));
writeFileSync(join(dir, "tray.png"), render(32));
console.log(`icon.ico (${SIZES.join(", ")} px) and tray.png written to ${dir}`);
