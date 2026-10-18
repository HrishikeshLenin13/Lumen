import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { decodePng, encodePng, resizeImage } from "./png.mjs";
const root = new URL("../", import.meta.url);
const art = new URL("art/", root);
const check = process.argv.includes("--check");
const logoFile = "lumen-logo.png"; const previewFile = "atlas-preview.png";
const sprites = readdirSync(art).filter((file) => file.endsWith(".png") && file !== logoFile && file !== previewFile).sort().map((file) => ({ name: file.slice(0, -4), ...decodePng(readFileSync(new URL(file, art))) }));
const sheet = ":root {\n" + sprites.map((sprite) => "  --icon-" + sprite.name + ": url(\"data:image/png;base64," + encodePng(sprite).toString("base64") + "\");").join("\n") + "\n}\n";
const logo = decodePng(readFileSync(new URL(logoFile, art)));
const tiles = [{ name: "logo", ...logo }, ...sprites].sort((a, b) => b.height - a.height || a.name.localeCompare(b.name)); const gap = 4; const previewWidth = 512; const spots = []; let x = gap; let y = gap; let rowHeight = 0;
for (const tile of tiles) { if (x + tile.width + gap > previewWidth) { x = gap; y += rowHeight + gap; rowHeight = 0; } spots.push([tile, x, y]); x += tile.width + gap; rowHeight = Math.max(rowHeight, tile.height); }
const preview = { width: previewWidth, height: y + rowHeight + gap, pixels: new Uint8Array(previewWidth * (y + rowHeight + gap) * 4) }; for (let at = 0; at < preview.pixels.length; at += 4) preview.pixels.set([128, 128, 128, 255], at);
for (const [tile, left, top] of spots) for (let row = 0; row < tile.height; row += 1) for (let column = 0; column < tile.width; column += 1) { const from = (row * tile.width + column) * 4; const alpha = tile.pixels[from + 3] / 255; const to = ((top + row) * preview.width + left + column) * 4; for (let channel = 0; channel < 3; channel += 1) preview.pixels[to + channel] = Math.round(tile.pixels[from + channel] * alpha + preview.pixels[to + channel] * (1 - alpha)); }
const outputs = [["css/sprites.css", Buffer.from(sheet)], ["art/" + previewFile, encodePng(preview)], ["icons/favicon.png", encodePng(resizeImage(logo, 32, 32))], ["icons/app-icon.png", encodePng(resizeImage(logo, 192, 192))], ["icons/app-icon-512.png", encodePng(resizeImage(logo, 512, 512))]];
const stale = outputs.filter(([file, bytes]) => { const url = new URL(file, root); return !existsSync(url) || !readFileSync(url).equals(bytes); });
if (!check) for (const [file, bytes] of stale) writeFileSync(new URL(file, root), bytes);
if (!check && stale.length) execFileSync(process.execPath, [new URL("stamp-cache.mjs", import.meta.url).pathname], { stdio: "inherit" });
if (stale.length) console.log((check ? "Out of date: " : "Built ") + stale.map(([file]) => file).join(", ") + " from " + sprites.length + " sprites");
process.exitCode = check && stale.length ? 1 : 0;
