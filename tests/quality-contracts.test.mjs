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

test("note-unicode-statistics-punctuation", () => {
assert.deepEqual(api.noteStats("one-two"),{words:1,characters:7,lines:1});assert.equal(api.noteReadingMinutes("one-two",2),1);
});

test("note-unicode-statistics-leading", () => {
assert.deepEqual(api.noteStats("  a"),{words:1,characters:3,lines:1});assert.equal(api.noteReadingMinutes("  a",2),1);
});

test("note-unicode-statistics-trailing", () => {
assert.deepEqual(api.noteStats("a  "),{words:1,characters:3,lines:1});assert.equal(api.noteReadingMinutes("a  ",2),1);
});

test("note-unicode-statistics-blank-lines", () => {
assert.deepEqual(api.noteStats("a\n\nb"),{words:2,characters:4,lines:3});assert.equal(api.noteReadingMinutes("a\n\nb",2),1);
});

test("neighbor-grid-1x1-0", () => {
const actual=api.neighbors(0,1,1).sort((a,b)=>a-b);const reference=[];for(let index=0;index<1;index++)if(index!==0&&Math.abs(index%1-0)<=1&&Math.abs(Math.floor(index/1)-0)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-2x2-0", () => {
const actual=api.neighbors(0,2,2).sort((a,b)=>a-b);const reference=[];for(let index=0;index<4;index++)if(index!==0&&Math.abs(index%2-0)<=1&&Math.abs(Math.floor(index/2)-0)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-2x2-3", () => {
const actual=api.neighbors(3,2,2).sort((a,b)=>a-b);const reference=[];for(let index=0;index<4;index++)if(index!==3&&Math.abs(index%2-1)<=1&&Math.abs(Math.floor(index/2)-1)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-3x3-0", () => {
const actual=api.neighbors(0,3,3).sort((a,b)=>a-b);const reference=[];for(let index=0;index<9;index++)if(index!==0&&Math.abs(index%3-0)<=1&&Math.abs(Math.floor(index/3)-0)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-3x3-4", () => {
const actual=api.neighbors(4,3,3).sort((a,b)=>a-b);const reference=[];for(let index=0;index<9;index++)if(index!==4&&Math.abs(index%3-1)<=1&&Math.abs(Math.floor(index/3)-1)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-3x3-8", () => {
const actual=api.neighbors(8,3,3).sort((a,b)=>a-b);const reference=[];for(let index=0;index<9;index++)if(index!==8&&Math.abs(index%3-2)<=1&&Math.abs(Math.floor(index/3)-2)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-4x3-1", () => {
const actual=api.neighbors(1,4,3).sort((a,b)=>a-b);const reference=[];for(let index=0;index<12;index++)if(index!==1&&Math.abs(index%4-1)<=1&&Math.abs(Math.floor(index/4)-0)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-4x3-5", () => {
const actual=api.neighbors(5,4,3).sort((a,b)=>a-b);const reference=[];for(let index=0;index<12;index++)if(index!==5&&Math.abs(index%4-1)<=1&&Math.abs(Math.floor(index/4)-1)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-4x3-11", () => {
const actual=api.neighbors(11,4,3).sort((a,b)=>a-b);const reference=[];for(let index=0;index<12;index++)if(index!==11&&Math.abs(index%4-3)<=1&&Math.abs(Math.floor(index/4)-2)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-5x2-0", () => {
const actual=api.neighbors(0,5,2).sort((a,b)=>a-b);const reference=[];for(let index=0;index<10;index++)if(index!==0&&Math.abs(index%5-0)<=1&&Math.abs(Math.floor(index/5)-0)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-5x2-4", () => {
const actual=api.neighbors(4,5,2).sort((a,b)=>a-b);const reference=[];for(let index=0;index<10;index++)if(index!==4&&Math.abs(index%5-4)<=1&&Math.abs(Math.floor(index/5)-0)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-5x2-5", () => {
const actual=api.neighbors(5,5,2).sort((a,b)=>a-b);const reference=[];for(let index=0;index<10;index++)if(index!==5&&Math.abs(index%5-0)<=1&&Math.abs(Math.floor(index/5)-1)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-5x2-9", () => {
const actual=api.neighbors(9,5,2).sort((a,b)=>a-b);const reference=[];for(let index=0;index<10;index++)if(index!==9&&Math.abs(index%5-4)<=1&&Math.abs(Math.floor(index/5)-1)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-7x7-24", () => {
const actual=api.neighbors(24,7,7).sort((a,b)=>a-b);const reference=[];for(let index=0;index<49;index++)if(index!==24&&Math.abs(index%7-3)<=1&&Math.abs(Math.floor(index/7)-3)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("neighbor-grid-8x6-47", () => {
const actual=api.neighbors(47,8,6).sort((a,b)=>a-b);const reference=[];for(let index=0;index<48;index++)if(index!==47&&Math.abs(index%8-7)<=1&&Math.abs(Math.floor(index/8)-5)<=1)reference.push(index);assert.deepEqual(actual,reference);assert.equal(new Set(actual).size,actual.length);
});

test("raster-line-connectivity-point", () => {
const points=api.linePoints(0,0,0,0);assert.deepEqual(points[0],[0,0]);assert.deepEqual(points.at(-1),[0,0]);assert.equal(points.length,1);for(let i=1;i<points.length;i++){assert.ok(Math.abs(points[i][0]-points[i-1][0])<=1);assert.ok(Math.abs(points[i][1]-points[i-1][1])<=1);assert.notDeepEqual(points[i],points[i-1]);}
});

test("raster-line-connectivity-east", () => {
const points=api.linePoints(0,0,5,0);assert.deepEqual(points[0],[0,0]);assert.deepEqual(points.at(-1),[5,0]);assert.equal(points.length,6);for(let i=1;i<points.length;i++){assert.ok(Math.abs(points[i][0]-points[i-1][0])<=1);assert.ok(Math.abs(points[i][1]-points[i-1][1])<=1);assert.notDeepEqual(points[i],points[i-1]);}
});
