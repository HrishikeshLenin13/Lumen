import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../js/data-core.mjs';
test('reading estimates support a supplied positive pace', () => { assert.equal(api.noteReadingMinutes('one two three',2),2); for(const pace of [0,-1,Infinity,NaN]) assert.throws(()=>api.noteReadingMinutes('words',pace),RangeError); });
