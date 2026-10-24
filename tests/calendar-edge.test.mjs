import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextOccurrence } from '../js/data-core.mjs';

test('leap day reminders cross a non-leap century', () => {
  assert.equal(nextOccurrence({date:'2096-02-29', repeat:'yearly'}, '2096-02-29'), '2104-02-29');
  assert.equal(nextOccurrence({date:'2024-02-29', repeat:'yearly'}, '2024-02-29'), '2028-02-29');
});
