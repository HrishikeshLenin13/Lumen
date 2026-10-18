import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { decodePng, encodePng, resizeImage } from "./png.mjs";
const root = new URL("../", import.meta.url);
const art = new URL("art/", root);
const check = process.argv.includes("--check");
const logoFile = "lumen-logo.png";
const sprites = readdirSync(art).filter((file) => file.endsWith(".png") && file !== logoFile).sort().map((file) => ({ name: file.slice(0, -4), ...decodePng(readFileSync(new URL(file, art))) }));
const sheetWidth = Math.max(256, ...sprites.map((sprite) => sprite.width));
const placed = new Map();
let x = 0; let y = 0; let rowHeight = 0;
for (const sprite of [...sprites].sort((a, b) => b.height - a.height || b.width - a.width || a.name.localeCompare(b.name))) { if (x + sprite.width > sheetWidth) { x = 0; y += rowHeight + 1; rowHeight = 0; } placed.set(sprite.name, [x, y]); x += sprite.width + 1; rowHeight = Math.max(rowHeight, sprite.height); }
const sheet = { width: sheetWidth, height: y + rowHeight, pixels: new Uint8Array(sheetWidth * (y + rowHeight) * 4) };
for (const sprite of sprites) { const [left, top] = placed.get(sprite.name); for (let row = 0; row < sprite.height; row += 1) sheet.pixels.set(sprite.pixels.subarray(row * sprite.width * 4, (row + 1) * sprite.width * 4), ((top + row) * sheet.width + left) * 4); }
const map = "export const atlasMap = {\n" + sprites.map((sprite) => "  " + JSON.stringify(sprite.name) + ": [" + [...placed.get(sprite.name), sprite.width, sprite.height].join(", ") + "],").join("\n") + "\n};\n";
const logo = decodePng(readFileSync(new URL(logoFile, art)));
const outputs = [["icons/atlas.png", encodePng(sheet)], ["js/atlas-map.mjs", Buffer.from(map)], ["icons/favicon.png", encodePng(resizeImage(logo, 32, 32))], ["icons/app-icon.png", encodePng(resizeImage(logo, 192, 192))], ["icons/app-icon-512.png", encodePng(resizeImage(logo, 512, 512))]];
const stale = outputs.filter(([file, bytes]) => { const url = new URL(file, root); return !existsSync(url) || !readFileSync(url).equals(bytes); });
if (!check) for (const [file, bytes] of stale) writeFileSync(new URL(file, root), bytes);
if (!check && stale.length) execFileSync(process.execPath, [new URL("stamp-cache.mjs", import.meta.url).pathname], { stdio: "inherit" });
if (stale.length) console.log((check ? "Out of date: " : "Built ") + stale.map(([file]) => file).join(", ") + " from " + sprites.length + " sprites");
process.exitCode = check && stale.length ? 1 : 0;
