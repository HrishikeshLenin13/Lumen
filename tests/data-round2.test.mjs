import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../js/data-core.mjs';
test('reading estimates support a supplied positive pace', () => { assert.equal(api.noteReadingMinutes('one two three',2),2); for(const pace of [0,-1,Infinity,NaN]) assert.throws(()=>api.noteReadingMinutes('words',pace),RangeError); });
test('tags deduplicate case-insensitively while preserving first spelling', () => { assert.deepEqual(api.normalizeTags(['Design','design',' DESIGN ','Code']),['Design','Code']); });
test('calendar recurrence rejects impossible dates without throwing', () => { assert.equal(api.isCalendarDate('2024-02-29'),true); assert.equal(api.isCalendarDate('2026-02-29'),false); assert.equal(api.nextOccurrence({date:'2026-99-99',repeat:'yearly'},'2026-10-26'),null); assert.equal(api.eventOn({date:'bad'},'bad'),false); assert.equal(api.normalizeData({events:[{date:'2026-02-30',text:'bad'}]}).events.length,0); });
test('paint fill rejects malformed dimensions, coordinates and colors', () => { const pixels=new Uint8ClampedArray(16); assert.equal(api.floodFill(pixels,2,2,.5,0,[0,0,0,255]),0); assert.equal(api.floodFill(pixels,3,2,0,0,[0,0,0,255]),0); assert.equal(api.floodFill(pixels,2,2,0,0,[0,0,0,999]),0); });
test('mine reveal ignores invalid starting cells without mutating prior reveals', () => { const prior=new Set([0]); const field=[{mine:false,count:0}]; assert.deepEqual(api.revealArea(field,1,1,9,prior),prior); assert.deepEqual(api.revealArea(field,0,1,0,prior),prior); assert.equal(prior.size,1); });

test('generated rectangular fills and reveals stay bounded and detached', () => {
  for(let width=1;width<=12;width++) for(let height=1;height<=8;height++) {
    const pixels=new Uint8ClampedArray(width*height*4), color=[12,34,56,255];
    assert.equal(api.floodFill(pixels,width,height,width-1,height-1,color),width*height);
    assert.equal(api.floodFill(pixels,width,height,0,0,color),0);
    for(let i=0;i<pixels.length;i++) assert.equal(pixels[i],color[i%4]);
    const field=Array.from({length:width*height},()=>({mine:false,count:0})), prior=new Set();
    const next=api.revealArea(field,width,height,0,prior);
    assert.equal(next.size,width*height);assert.equal(prior.size,0);
    for(const index of next) assert.ok(index>=0 && index<field.length);
  }
});
test('leap-date validation follows Gregorian century rules', () => {
  for(const year of [1900,1996,2000,2004,2024,2026,2100,2400]) {
    assert.equal(api.isCalendarDate(`${year}-02-29`),year%4===0 && (year%100!==0 || year%400===0));
    assert.equal(api.isCalendarDate(`${year}-04-31`),false);
    assert.equal(api.isCalendarDate(`${year}-12-31`),true);
  }
});
