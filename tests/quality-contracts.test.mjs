import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../js/data-core.mjs';

test("month-grid-1-0", () => {
const grid=api.monthGrid(1,0);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,31);assert.equal(grid.find(x=>x.inMonth).date,"0001-01-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-4-1", () => {
const grid=api.monthGrid(4,1);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,29);assert.equal(grid.find(x=>x.inMonth).date,"0004-02-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-99-1", () => {
const grid=api.monthGrid(99,1);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,28);assert.equal(grid.find(x=>x.inMonth).date,"0099-02-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-100-1", () => {
const grid=api.monthGrid(100,1);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,28);assert.equal(grid.find(x=>x.inMonth).date,"0100-02-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-400-1", () => {
const grid=api.monthGrid(400,1);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,29);assert.equal(grid.find(x=>x.inMonth).date,"0400-02-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-1900-1", () => {
const grid=api.monthGrid(1900,1);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,28);assert.equal(grid.find(x=>x.inMonth).date,"1900-02-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-2000-1", () => {
const grid=api.monthGrid(2000,1);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,29);assert.equal(grid.find(x=>x.inMonth).date,"2000-02-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-2024-1", () => {
const grid=api.monthGrid(2024,1);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,29);assert.equal(grid.find(x=>x.inMonth).date,"2024-02-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-2100-1", () => {
const grid=api.monthGrid(2100,1);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,28);assert.equal(grid.find(x=>x.inMonth).date,"2100-02-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-2026-0", () => {
const grid=api.monthGrid(2026,0);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,31);assert.equal(grid.find(x=>x.inMonth).date,"2026-01-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-2026-11", () => {
const grid=api.monthGrid(2026,11);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,31);assert.equal(grid.find(x=>x.inMonth).date,"2026-12-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-2026-minus1", () => {
const grid=api.monthGrid(2026,-1);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,31);assert.equal(grid.find(x=>x.inMonth).date,"2025-12-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-2026-12", () => {
const grid=api.monthGrid(2026,12);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,31);assert.equal(grid.find(x=>x.inMonth).date,"2027-01-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-2026-25", () => {
const grid=api.monthGrid(2026,25);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,29);assert.equal(grid.find(x=>x.inMonth).date,"2028-02-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-9998-11", () => {
const grid=api.monthGrid(9998,11);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,31);assert.equal(grid.find(x=>x.inMonth).date,"9998-12-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("note-unicode-statistics-empty", () => {
assert.deepEqual(api.noteStats(""),{words:0,characters:0,lines:0});assert.equal(api.noteReadingMinutes("",2),0);
});

test("note-unicode-statistics-spaces", () => {
assert.deepEqual(api.noteStats("   "),{words:0,characters:3,lines:1});assert.equal(api.noteReadingMinutes("   ",2),0);
});

test("note-unicode-statistics-newline", () => {
assert.deepEqual(api.noteStats("\n"),{words:0,characters:1,lines:2});assert.equal(api.noteReadingMinutes("\n",2),0);
});

test("note-unicode-statistics-one", () => {
assert.deepEqual(api.noteStats("hello"),{words:1,characters:5,lines:1});assert.equal(api.noteReadingMinutes("hello",2),1);
});

test("note-unicode-statistics-emoji", () => {
assert.deepEqual(api.noteStats("\ud83d\udcda"),{words:1,characters:1,lines:1});assert.equal(api.noteReadingMinutes("\ud83d\udcda",2),1);
});

test("note-unicode-statistics-combining", () => {
assert.deepEqual(api.noteStats("e\u0301"),{words:1,characters:2,lines:1});assert.equal(api.noteReadingMinutes("e\u0301",2),1);
});

test("note-unicode-statistics-cjk", () => {
assert.deepEqual(api.noteStats("\u6570\u5b66"),{words:1,characters:2,lines:1});assert.equal(api.noteReadingMinutes("\u6570\u5b66",2),1);
});

test("note-unicode-statistics-tabs", () => {
assert.deepEqual(api.noteStats("one\ttwo"),{words:2,characters:7,lines:1});assert.equal(api.noteReadingMinutes("one\ttwo",2),1);
});

test("note-unicode-statistics-crlf", () => {
assert.deepEqual(api.noteStats("a\r\nb"),{words:2,characters:4,lines:2});assert.equal(api.noteReadingMinutes("a\r\nb",2),1);
});

test("note-unicode-statistics-unicode-space", () => {
assert.deepEqual(api.noteStats("a\u00a0b"),{words:2,characters:3,lines:1});assert.equal(api.noteReadingMinutes("a\u00a0b",2),1);
});

test("note-unicode-statistics-multiline", () => {
assert.deepEqual(api.noteStats("a\nb\nc"),{words:3,characters:5,lines:3});assert.equal(api.noteReadingMinutes("a\nb\nc",2),2);
});
