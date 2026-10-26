import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, inflateSync } from 'node:zlib';
import { encodePng } from '../scripts/png.mjs';
import { equivalentAsset } from '../scripts/asset-equivalence.mjs';

// Rebuild a valid IDAT chunk with a different compression level and its own CRC.
function recompress(png) {
  const chunks = [png.subarray(0, 8)];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const kind = png.toString('ascii', offset + 4, offset + 8);
    const end = offset + length + 12;
    if (kind !== 'IDAT') chunks.push(png.subarray(offset, end));
    else {
      const body = deflateSync(inflateSync(png.subarray(offset + 8, end - 4)), { level: 0 });
      const chunk = Buffer.alloc(body.length + 12);
      chunk.writeUInt32BE(body.length); chunk.write('IDAT', 4); body.copy(chunk, 8);
      let crc = 0xffffffff;
      for (const byte of chunk.subarray(4, -4)) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
      }
      chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, chunk.length - 4);
      chunks.push(chunk);
    }
    offset = end;
  }
  return Buffer.concat(chunks);
}
const png = encodePng({ width: 2, height: 1, pixels: new Uint8Array([1,2,3,255,4,5,6,255]) });
const alternate = recompress(png);
const css = (name, bytes) => Buffer.from(`:root { --icon-${name}: url("data:image/png;base64,${bytes.toString('base64')}"); }`);
test('PNG checks tolerate compression differences but not changed pixels or dimensions', () => {
  assert.notDeepEqual(png, alternate);
  assert.equal(equivalentAsset('icons/app-icon.png', png, alternate), true);
  for (const changed of [
    encodePng({width:2,height:1,pixels:new Uint8Array([9,2,3,255,4,5,6,255])}),
    encodePng({width:1,height:2,pixels:new Uint8Array([1,2,3,255,4,5,6,255])}),
    Buffer.from('not a PNG'),
  ]) assert.equal(equivalentAsset('icons/app-icon.png', png, changed), false);
});
test('sprite CSS checks retain names and all non-image declarations', () => {
  assert.equal(equivalentAsset('css/sprites.css',css('note',png),css('note',alternate)),true);
  assert.equal(equivalentAsset('css/sprites.css',css('note',png),css('paint',alternate)),false);
  assert.equal(equivalentAsset('css/sprites.css',css('note',png),Buffer.concat([css('note',alternate),Buffer.from('body { color: red; }')])),false);
  assert.equal(equivalentAsset('other.txt',png,alternate),false);
});
