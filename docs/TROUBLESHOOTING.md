# Troubleshooting Lumen

Use the smallest reproducible fixture before changing production data or configuration. Run commands from the repository root.

## The offline app still runs older code

Run the cache stamp generator after source changes, check its --check mode, then reload the service-worker-controlled page. Export personal data before clearing site storage.

## An event disappears during normalization

Check for an impossible calendar date such as February 30. Preserve a copy of the imported JSON while diagnosing it.

## Paint fill returns zero

Validate canvas width/height, pixel-buffer length, integer start coordinates, and replacement channels. An unchanged color can also produce no work.

## Reproduce and report

1. Record the exact command or UI action, runtime version, expected result, and actual result.
2. Run the regression command below on the same checkout and keep its first failure, not only the final summary.
3. Reduce the issue to a deterministic fixture without personal data or credentials.
4. Include the affected source path from the [feature guide](RECENT_IMPROVEMENTS.md) and whether it reproduces on a clean checkout.

```sh
node --test tests/*.test.mjs && node scripts/stamp-cache.mjs --check
```

## Recovery

Keep a copy of input data before experimenting. Revert the individual source change with Git and rerun the same fixture; a source revert does not automatically reverse browser storage, downloaded files, or external service state. Do not delete a lockfile or weaken a validation gate to make a failure disappear.

## Atlas checks differ across Node or operating-system versions

PNG compression bytes can vary with the runtime's zlib implementation. Check mode compares decoded dimensions and RGBA pixels for PNGs and embedded sprite images while preserving all other CSS text. A changed pixel, sprite name, or declaration still fails. Normal build mode continues to write byte-reproducible assets for the current runtime. Run `node scripts/build-atlas.mjs --check` directly to see which assets differ; do not rebuild artwork merely to silence a compression-only mismatch.
