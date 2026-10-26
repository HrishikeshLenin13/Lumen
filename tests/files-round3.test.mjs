import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copyName,cloneFiles,monthGrid} from '../js/data-core.mjs';
test('copy naming checks the final bounded candidate instead of truncating after collision checks',()=>{const original='x'.repeat(80),first='Copy of '+'x'.repeat(72);const next=copyName(original,[original,first]);assert.equal(next.length,80);assert.notEqual(next,first);assert.ok(next.startsWith('Copy (2) of '));});
