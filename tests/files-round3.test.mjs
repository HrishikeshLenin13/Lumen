import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copyName,cloneFiles,monthGrid} from '../js/data-core.mjs';
test('copy naming checks the final bounded candidate instead of truncating after collision checks',()=>{const original='x'.repeat(80),first='Copy of '+'x'.repeat(72);const next=copyName(original,[original,first]);assert.equal(next.length,80);assert.notEqual(next,first);assert.ok(next.startsWith('Copy (2) of '));});
test('indexed cloning preserves depth-first ordering and source metadata',()=>{const files=[{id:'a',name:'A',kind:'folder',parent:null},{id:'b',name:'B',kind:'text',parent:'a',content:'text'},{id:'c',name:'C',kind:'text',parent:'a'}];let i=0;const copied=cloneFiles(files,'a',null,()=>String(++i));assert.deepEqual(copied.map(x=>x.name),['Copy of A','B','C']);assert.equal(copied[1].parent,'1');assert.equal(copied[1].content,'text');assert.equal(files[0].id,'a');});
