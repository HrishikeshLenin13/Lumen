import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../js/data-core.mjs';

test("month-grid-1-0", () => {
const grid=api.monthGrid(1,0);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,31);assert.equal(grid.find(x=>x.inMonth).date,"0001-01-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});

test("month-grid-4-1", () => {
const grid=api.monthGrid(4,1);assert.equal(grid.length,42);assert.equal(grid.filter(x=>x.inMonth).length,29);assert.equal(grid.find(x=>x.inMonth).date,"0004-02-01");for(let i=1;i<grid.length;i++)assert.equal(Date.parse(grid[i].date+'T00:00Z')-Date.parse(grid[i-1].date+'T00:00Z'),86400000);
});
