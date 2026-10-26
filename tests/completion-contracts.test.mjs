import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../js/data-core.mjs';

test("reading-estimates-round-up-partial-minutes", () => {
assert.equal(api.noteReadingMinutes('one two three',2),2);
});

test("empty-notes-have-zero-reading-time", () => {
assert.equal(api.noteReadingMinutes('',200),0);
});

test("reading-pace-rejects-nonpositive-and-nonfinite-values", () => {
for(const pace of [0,-1,NaN,Infinity])assert.throws(()=>api.noteReadingMinutes('text',pace));
});

test("note-statistics-count-unicode-code-points", () => {
assert.equal(api.noteStats('🚀').characters,1);assert.equal(api.noteStats('a\nb').lines,2);
});

test("blank-revisions-do-not-fill-history", () => {
assert.deepEqual(api.appendNoteRevision([],'   '),[]);
});

test("duplicate-head-revisions-do-not-repeat-snapshots", () => {
const h=api.appendNoteRevision([],'same','now','a');assert.equal(api.appendNoteRevision(h,'same','later','b').length,1);
});

test("note-history-is-bounded-to-twenty-revisions", () => {
let h=[];for(let i=0;i<25;i++)h=api.appendNoteRevision(h,'text'+i,'now',String(i));assert.equal(h.length,20);assert.equal(h[0].id,'24');
});

test("oversized-revisions-do-not-enter-history", () => {
assert.deepEqual(api.appendNoteRevision([],'x'.repeat(100001)),[]);
});
