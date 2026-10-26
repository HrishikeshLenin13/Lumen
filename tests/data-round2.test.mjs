import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../js/data-core.mjs';
test('reading estimates support a supplied positive pace', () => { assert.equal(api.noteReadingMinutes('one two three',2),2); for(const pace of [0,-1,Infinity,NaN]) assert.throws(()=>api.noteReadingMinutes('words',pace),RangeError); });
test('tags deduplicate case-insensitively while preserving first spelling', () => { assert.deepEqual(api.normalizeTags(['Design','design',' DESIGN ','Code']),['Design','Code']); });
test('calendar recurrence rejects impossible dates without throwing', () => { assert.equal(api.isCalendarDate('2024-02-29'),true); assert.equal(api.isCalendarDate('2026-02-29'),false); assert.equal(api.nextOccurrence({date:'2026-99-99',repeat:'yearly'},'2026-10-26'),null); assert.equal(api.eventOn({date:'bad'},'bad'),false); assert.equal(api.normalizeData({events:[{date:'2026-02-30',text:'bad'}]}).events.length,0); });
test('paint fill rejects malformed dimensions, coordinates and colors', () => { const pixels=new Uint8ClampedArray(16); assert.equal(api.floodFill(pixels,2,2,.5,0,[0,0,0,255]),0); assert.equal(api.floodFill(pixels,3,2,0,0,[0,0,0,255]),0); assert.equal(api.floodFill(pixels,2,2,0,0,[0,0,0,999]),0); });
