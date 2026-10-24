import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreTimerState } from '../js/data-core.mjs';
test('restored paused timers normalize malformed state', () => {
  assert.equal(restoreTimerState({secondsLeft:-5, mode:'junk'}, 25).secondsLeft, 0);
  assert.equal(restoreTimerState({secondsLeft:1.2}, 25).secondsLeft, 2);
  assert.equal(restoreTimerState({secondsLeft:NaN}, 25).secondsLeft, 1500);
  assert.equal(restoreTimerState({secondsLeft:NaN}, NaN).secondsLeft, 1500);
  assert.equal(restoreTimerState({secondsLeft:NaN}, Infinity).secondsLeft, 1500);
  assert.equal(restoreTimerState({mode:'junk'}, 25).mode, 'focus');
});
