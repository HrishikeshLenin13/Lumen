import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../js/data-core.mjs';

test("reading-estimates-round-up-partial-minutes", () => {
assert.equal(api.noteReadingMinutes('one two three',2),2);
});

test("empty-notes-have-zero-reading-time", () => {
assert.equal(api.noteReadingMinutes('',200),0);
});
