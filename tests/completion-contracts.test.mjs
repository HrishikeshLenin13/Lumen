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

test("missing-revision-restore-preserves-current-note", () => {
const r=api.restoreNoteRevision([],'current','missing');assert.equal(r.ok,false);assert.equal(r.text,'current');
});

test("restoring-an-old-revision-preserves-current-work", () => {
const h=api.appendNoteRevision([],'old','now','old'),r=api.restoreNoteRevision(h,'current','old','later','new');assert.equal(r.ok,true);assert.equal(r.text,'old');assert.equal(r.history[0].text,'current');
});

test("tag-normalization-preserves-first-case-spelling", () => {
assert.deepEqual(api.normalizeTags(['Design','design','DESIGN']),['Design']);
});

test("tag-normalization-collapses-internal-whitespace", () => {
assert.deepEqual(api.normalizeTags('a   b, a b'),['a b']);
});

test("tag-normalization-bounds-count-and-length", () => {
const tags=api.normalizeTags(Array.from({length:20},(_,i)=>String(i)+'x'.repeat(40)));assert.equal(tags.length,8);assert.ok(tags.every(x=>x.length<=24));
});

test("blank-tags-do-not-become-search-metadata", () => {
assert.deepEqual(api.normalizeTags(' , , '),[]);
});

test("log-entry-validation-accepts-quarter-hour-steps", () => {
assert.equal(api.validateLogEntry({hours:1.25,description:'work'}).ok,true);
});

test("new-log-entry-validation-rejects-fractional-steps", () => {
assert.equal(api.validateLogEntry({hours:1.1,description:'work'}).ok,false);
});

test("log-validation-retains-unchanged-legacy-hour-values", () => {
assert.equal(api.validateLogEntry({hours:1.1,existingHours:1.1,description:'work'}).ok,true);
});

test("log-validation-rejects-empty-descriptions", () => {
assert.equal(api.validateLogEntry({hours:1,description:'   '}).ok,false);
});

test("log-validation-bounds-description-and-project-fields", () => {
assert.equal(api.validateLogEntry({hours:1,description:'x'.repeat(241)}).ok,false);assert.equal(api.validateLogEntry({hours:1,description:'work',project:'x'.repeat(60)}).value.project.length,48);
});

test("log-filter-searches-project-and-tags", () => {
const logs=[{at:'2026-01-01',text:'work',h:1,project:'Alpha',tags:['Research']}];assert.equal(api.filterLogs(logs,{query:'research'}).length,1);assert.equal(api.filterLogs(logs,{query:'alpha'}).length,1);
});

test("unfiltered-log-results-are-detached-arrays", () => {
const rows=[];assert.notEqual(api.filterLogs(rows),rows);assert.deepEqual(api.filterLogs(rows),rows);
});

test("date-filter-excludes-malformed-log-timestamps", () => {
assert.equal(api.filterLogs([{at:'bad',text:'x',h:1}],{days:1,now:Date.parse('2026-01-02')}).length,0);
});

test("csv-escapes-description-quotes-and-newlines", () => {
assert.ok(api.logsToCsv([{at:'now',h:1,text:'A"B\nC',tags:[]}]).includes('A""B\nC'));
});

test("csv-neutralizes-leading-spreadsheet-formulas", () => {
assert.ok(api.logsToCsv([{at:'now',h:1,text:'=1+1',tags:[]}]).includes("'=1+1"));
});

test("timer-restore-does-not-resume-invalid-end-times", () => {
const r=api.restoreTimerState({running:true,endAt:NaN,secondsLeft:12},25,100);assert.equal(r.running,false);assert.equal(r.endAt,null);
});

test("timer-restore-rounds-running-seconds-up", () => {
assert.equal(api.restoreTimerState({running:true,endAt:2501},25,1000).secondsLeft,2);
});

test("expired-running-timers-have-no-negative-seconds", () => {
assert.equal(api.restoreTimerState({running:true,endAt:10},25,1000).secondsLeft,0);
});

test("paused-timer-restore-keeps-explicit-remaining-time", () => {
const r=api.restoreTimerState({running:false,secondsLeft:12,mode:'break'},25);assert.equal(r.secondsLeft,12);assert.equal(r.mode,'break');
});

test("unknown-timer-modes-default-to-focus", () => {
assert.equal(api.restoreTimerState({mode:'unknown'},25).mode,'focus');
});

test("completed-breaks-do-not-create-focus-sessions", () => {
assert.deepEqual(api.appendCompletedSession([],'break',5),[]);
});

test("completed-focus-history-is-bounded", () => {
const r=api.appendCompletedSession(Array(60).fill({minutes:1}),'focus',25,'now');assert.equal(r.length,50);assert.equal(r[0].at,'now');
});

test("completed-focus-duration-is-clamped", () => {
assert.equal(api.appendCompletedSession([],'focus',999)[0].minutes,180);assert.equal(api.appendCompletedSession([],'focus',0)[0].minutes,1);
});

test("corner-neighbors-do-not-wrap-around-the-board", () => {
assert.deepEqual(api.neighbors(0,3,3).sort((a,b)=>a-b),[1,3,4]);
});

test("center-neighbors-cover-eight-distinct-cells", () => {
const n=api.neighbors(4,3,3);assert.equal(n.length,8);assert.equal(new Set(n).size,8);assert.ok(!n.includes(4));
});

test("empty-mine-boards-reveal-every-safe-cell", () => {
const field=Array.from({length:9},()=>({mine:false,count:0}));assert.equal(api.revealArea(field,3,3,0).size,9);
});

test("flagged-start-cells-are-not-revealed", () => {
assert.equal(api.revealArea([{mine:false,count:0}],1,1,0,new Set(),new Set([0])).size,0);
});

test("paint-fill-does-not-repaint-an-identical-color", () => {
const pixels=new Uint8ClampedArray([1,2,3,4]);assert.equal(api.floodFill(pixels,1,1,0,0,[1,2,3,4]),0);assert.deepEqual([...pixels],[1,2,3,4]);
});

test("paint-fill-does-not-cross-color-boundaries", () => {
const p=new Uint8ClampedArray([1,1,1,255,2,2,2,255]);assert.equal(api.floodFill(p,2,1,0,0,[3,3,3,255]),1);assert.equal(p[4],2);
});

test("invalid-paint-coordinates-do-not-mutate-pixels", () => {
const p=new Uint8ClampedArray(4);assert.equal(api.floodFill(p,1,1,-1,0,[1,2,3,255]),0);assert.deepEqual([...p],[0,0,0,0]);
});

test("calendar-validation-follows-gregorian-century-rules", () => {
assert.equal(api.isCalendarDate('2000-02-29'),true);assert.equal(api.isCalendarDate('1900-02-29'),false);
});

test("calendar-grids-preserve-month-overflow-navigation", () => {
assert.ok(api.monthGrid(2026,12).some(x=>x.date==='2027-01-01'&&x.inMonth));
});

test("calendar-grids-retain-early-years", () => {
assert.ok(api.monthGrid(42,1).some(x=>x.date==='0042-02-01'&&x.inMonth));
});

test("copy-names-are-collision-checked-after-bounding", () => {
const base='x'.repeat(80),taken=[base,'Copy of '+'x'.repeat(72)];const name=api.copyName(base,taken);assert.equal(name.length,80);assert.ok(!taken.includes(name));
});

test("file-cloning-does-not-alias-source-records", () => {
const files=[{id:'a',name:'A',parent:null,content:'old'}];const copies=api.cloneFiles(files,'a',null,()=> 'new');copies[0].content='changed';assert.equal(files[0].content,'old');
});

test("file-cloning-rejects-colliding-generated-identifiers", () => {
assert.throws(()=>api.cloneFiles([{id:'a',name:'A',parent:null}],'a',null,()=> 'a'),RangeError);
});
