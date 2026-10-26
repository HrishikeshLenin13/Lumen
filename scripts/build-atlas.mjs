import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { decodePng, encodePng } from "./png.mjs";
import { equivalentAsset } from "./asset-equivalence.mjs";
const root = new URL("../", import.meta.url);
const art = new URL("art/", root);
const check = process.argv.includes("--check");
const logoFile = "lumen-logo.png"; const previewFile = "atlas-preview.png";
const sprites = readdirSync(art).filter((file) => file.endsWith(".png") && file !== logoFile && file !== previewFile).sort().map((file) => ({ name: file.slice(0, -4), ...decodePng(readFileSync(new URL(file, art))) }));
const sheet = ":root {\n" + sprites.map((sprite) => "  --icon-" + sprite.name + ": url(\"data:image/png;base64," + encodePng(sprite).toString("base64") + "\");").join("\n") + "\n}\n";
const mark = decodePng(readFileSync(new URL("l.png", art))); const logoAt = (size) => { const scale = Math.max(1, Math.floor(Math.min(size * 0.79 / mark.width, size * 0.71 / mark.height))); const left = Math.floor((size - mark.width * scale) / 2); const top = Math.floor((size - mark.height * scale) / 2); const image = { width: size, height: size, pixels: new Uint8Array(size * size * 4) }; for (let at = 0; at < image.pixels.length; at += 4) image.pixels.set([36, 94, 219, 255], at); for (let row = 0; row < mark.height * scale; row += 1) for (let column = 0; column < mark.width * scale; column += 1) { const from = (Math.floor(row / scale) * mark.width + Math.floor(column / scale)) * 4; const alpha = mark.pixels[from + 3] / 255; const to = ((top + row) * size + left + column) * 4; for (let channel = 0; channel < 3; channel += 1) image.pixels[to + channel] = Math.round(mark.pixels[from + channel] * alpha + image.pixels[to + channel] * (1 - alpha)); } return image; }; const logo = logoAt(192);
const tiles = [{ name: "logo", ...logo }, ...sprites].sort((a, b) => b.height - a.height || a.name.localeCompare(b.name)); const gap = 4; const previewWidth = 512; const spots = []; let x = gap; let y = gap; let rowHeight = 0;
for (const tile of tiles) { if (x + tile.width + gap > previewWidth) { x = gap; y += rowHeight + gap; rowHeight = 0; } spots.push([tile, x, y]); x += tile.width + gap; rowHeight = Math.max(rowHeight, tile.height); }
const preview = { width: previewWidth, height: y + rowHeight + gap, pixels: new Uint8Array(previewWidth * (y + rowHeight + gap) * 4) }; for (let at = 0; at < preview.pixels.length; at += 4) preview.pixels.set([128, 128, 128, 255], at);
for (const [tile, left, top] of spots) for (let row = 0; row < tile.height; row += 1) for (let column = 0; column < tile.width; column += 1) { const from = (row * tile.width + column) * 4; const alpha = tile.pixels[from + 3] / 255; const to = ((top + row) * preview.width + left + column) * 4; for (let channel = 0; channel < 3; channel += 1) preview.pixels[to + channel] = Math.round(tile.pixels[from + channel] * alpha + preview.pixels[to + channel] * (1 - alpha)); }
const outputs = [["css/sprites.css", Buffer.from(sheet)], ["art/" + previewFile, encodePng(preview)], ["art/" + logoFile, encodePng(logo)], ["icons/favicon.png", encodePng(logoAt(32))], ["icons/app-icon.png", encodePng(logo)], ["icons/app-icon-512.png", encodePng(logoAt(512))]];
const stale = outputs.filter(([file, bytes]) => { const url = new URL(file, root); return !existsSync(url) || (check ? !equivalentAsset(file, readFileSync(url), bytes) : !readFileSync(url).equals(bytes)); });
if (!check) for (const [file, bytes] of stale) writeFileSync(new URL(file, root), bytes);
if (!check && stale.length) execFileSync(process.execPath, [new URL("stamp-cache.mjs", import.meta.url).pathname], { stdio: "inherit" });
if (stale.length) console.log((check ? "Out of date: " : "Built ") + stale.map(([file]) => file).join(", ") + " from " + sprites.length + " sprites");
process.exitCode = check && stale.length ? 1 : 0;
