import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteReadingMinutes } from '../js/data-core.mjs';
test('reading estimate counts words at 200 per minute without changing notes', () => {
  assert.equal(noteReadingMinutes(''), 0);
  assert.equal(noteReadingMinutes('   \n'), 0);
  assert.equal(noteReadingMinutes('hello'), 1);
  assert.equal(noteReadingMinutes(Array(200).fill('word').join(' ')), 1);
  assert.equal(noteReadingMinutes(Array(201).fill('word').join(' ')), 2);
});
