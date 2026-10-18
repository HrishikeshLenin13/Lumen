import { deflateSync, inflateSync } from "node:zlib";
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({ length: 256 }, (_, index) => { let value = index; for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1; return value >>> 0; });
const crc = (bytes) => { let value = 0xffffffff; for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8); return (value ^ 0xffffffff) >>> 0; };
const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const paeth = (left, up, corner) => { const guess = left + up - corner; const toLeft = Math.abs(guess - left); const toUp = Math.abs(guess - up); const toCorner = Math.abs(guess - corner); return toLeft <= toUp && toLeft <= toCorner ? left : toUp <= toCorner ? up : corner; };
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(signature)) throw new Error("Not a PNG file");
  let offset = 8; let width = 0; let height = 0; let depth = 8; let type = 6; let palette = null; let transparency = null; const chunks = [];
  while (offset < buffer.length) { const length = buffer.readUInt32BE(offset); const kind = buffer.toString("ascii", offset + 4, offset + 8); const body = buffer.subarray(offset + 8, offset + 8 + length); offset += 12 + length; if (kind === "IHDR") { width = body.readUInt32BE(0); height = body.readUInt32BE(4); depth = body[8]; type = body[9]; if (body[12]) throw new Error("Interlaced PNGs are not supported"); } else if (kind === "PLTE") palette = body; else if (kind === "tRNS") transparency = body; else if (kind === "IDAT") chunks.push(body); else if (kind === "IEND") break; }
  const raw = inflateSync(Buffer.concat(chunks)); const bitsPerPixel = channels[type] * depth; const stride = Math.ceil(width * bitsPerPixel / 8); const step = Math.max(1, bitsPerPixel >> 3); const rows = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) { const filter = raw[y * (stride + 1)]; for (let x = 0; x < stride; x += 1) { const value = raw[y * (stride + 1) + 1 + x]; const left = x >= step ? rows[y * stride + x - step] : 0; const up = y ? rows[(y - 1) * stride + x] : 0; const corner = y && x >= step ? rows[(y - 1) * stride + x - step] : 0; rows[y * stride + x] = (value + [0, left, up, (left + up) >> 1, paeth(left, up, corner)][filter]) & 255; } }
  const sample = (y, index) => { if (depth === 8) return rows[y * stride + index]; if (depth === 16) return rows[y * stride + index * 2]; const bit = index * depth; return (rows[y * stride + (bit >> 3)] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1); };
  const scale = depth < 8 ? 255 / ((1 << depth) - 1) : 1; const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const at = (y * width + x) * 4; const base = x * channels[type]; let red; let green; let blue; let alpha = 255;
    if (type === 3) { const index = sample(y, base); red = palette[index * 3]; green = palette[index * 3 + 1]; blue = palette[index * 3 + 2]; alpha = transparency && index < transparency.length ? transparency[index] : 255; }
    else if (type === 0 || type === 4) { const raw16 = depth === 16 ? rows.readUInt16BE(y * stride + base * 2) : sample(y, base); red = green = blue = Math.round(sample(y, base) * scale); if (type === 4) alpha = Math.round(sample(y, base + 1) * scale); else if (transparency && raw16 === transparency.readUInt16BE(0)) alpha = 0; }
    else { red = sample(y, base); green = sample(y, base + 1); blue = sample(y, base + 2); if (type === 6) alpha = sample(y, base + 3); else if (transparency && depth === 8 && red === transparency[1] && green === transparency[3] && blue === transparency[5]) alpha = 0; }
    pixels.set([red, green, blue, alpha], at); }
  return { width, height, pixels };
}
export function encodePng({ width, height, pixels }) {
  const stride = width * 4; const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) { raw[y * (stride + 1)] = 1; for (let x = 0; x < stride; x += 1) raw[y * (stride + 1) + 1 + x] = (pixels[y * stride + x] - (x >= 4 ? pixels[y * stride + x - 4] : 0)) & 255; }
  const chunk = (kind, body) => { const head = Buffer.alloc(8); head.writeUInt32BE(body.length, 0); head.write(kind, 4, "ascii"); const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), body])), 0); return Buffer.concat([head, body, tail]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([signature, chunk("IHDR", header), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
export function resizeImage(image, width, height) {
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const left = Math.floor(x * image.width / width); const right = Math.max(left + 1, Math.floor((x + 1) * image.width / width)); const top = Math.floor(y * image.height / height); const bottom = Math.max(top + 1, Math.floor((y + 1) * image.height / height)); const total = [0, 0, 0, 0]; let count = 0;
    for (let sy = top; sy < bottom; sy += 1) for (let sx = left; sx < right; sx += 1) { const at = (sy * image.width + sx) * 4; const alpha = image.pixels[at + 3]; total[0] += image.pixels[at] * alpha; total[1] += image.pixels[at + 1] * alpha; total[2] += image.pixels[at + 2] * alpha; total[3] += alpha; count += 1; }
    const at = (y * width + x) * 4; pixels.set(total[3] ? [Math.round(total[0] / total[3]), Math.round(total[1] / total[3]), Math.round(total[2] / total[3]), Math.round(total[3] / count)] : [0, 0, 0, 0], at); }
  return { width, height, pixels };
}
