# Resilient desktop data primitives

This guide covers implemented behavior. It does not change deployment or account configuration.

## Usage

```js
import { noteReadingMinutes, normalizeTags, isCalendarDate } from './js/data-core.mjs';
noteReadingMinutes('one two three', 2); // 2 minutes at a supplied pace
normalizeTags(['Design', 'design', 'Code']); // ['Design', 'Code']
isCalendarDate('2024-02-29'); // true
```

## Contracts and limits

- Reading estimates accept a positive finite words-per-minute pace. The default remains 200. Tags deduplicate case-insensitively and retain the first spelling.
- Calendar dates must be real YYYY-MM-DD dates; impossible dates are rejected before recurrence calculation.
- Flood fill checks dimensions, buffer length, integer coordinates, and RGBA channel bounds before mutating pixels.
- Mine reveal returns a detached set for invalid starts or malformed boards. Data-core changes require a regenerated cache stamp so offline clients receive the right assets.

## Source map

- [`js/data-core.mjs`](../js/data-core.mjs)
<!-- source: js/data-core.mjs -->
- [`tests/data-round2.test.mjs`](../tests/data-round2.test.mjs)
<!-- source: tests/data-round2.test.mjs -->
- [`scripts/stamp-cache.mjs`](../scripts/stamp-cache.mjs)
<!-- source: scripts/stamp-cache.mjs -->

## Regression command

Run from the repository root:

```sh
node --test tests/*.test.mjs && node scripts/stamp-cache.mjs --check
```

