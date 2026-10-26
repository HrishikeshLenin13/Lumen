import { decodePng } from './png.mjs';

function rasterKey(bytes) {
  const image = decodePng(bytes);
  return `${image.width}x${image.height}:${Buffer.from(image.pixels).toString('hex')}`;
}

function normalizedSprites(bytes) {
  return bytes.toString('utf8').replace(
    /url\("data:image\/png;base64,([^"\r\n]+)"\)/g,
    (_, payload) => `url("raster:${rasterKey(Buffer.from(payload, 'base64'))}")`,
  );
}

/** Compression libraries can emit different valid PNG bytes for identical pixels. */
export function equivalentAsset(file, actual, expected) {
  if (actual.equals(expected)) return true;
  try {
    if (file.endsWith('.png')) return rasterKey(actual) === rasterKey(expected);
    if (file === 'css/sprites.css') return normalizedSprites(actual) === normalizedSprites(expected);
  } catch {
    // Corrupt generated assets must still fail validation.
  }
  return false;
}
