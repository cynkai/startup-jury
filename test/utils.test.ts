import assert from 'node:assert/strict';
import { test } from 'node:test';

import { average, clampScore, investmentVerdictFromScore, uniqueNonEmpty, verdictFromScore } from '../src/utils.js';

test('clampScore rounds and keeps scores within 0-100', () => {
  assert.equal(clampScore(-5), 0);
  assert.equal(clampScore(150), 100);
  assert.equal(clampScore(77.5), 78);
});

test('investment verdict thresholds are 78 and 55', () => {
  assert.equal(investmentVerdictFromScore(78), 'invest');
  assert.equal(investmentVerdictFromScore(77), 'watch');
  assert.equal(investmentVerdictFromScore(55), 'watch');
  assert.equal(investmentVerdictFromScore(54), 'pass');
});

test('agent verdict thresholds are 75 and 50', () => {
  assert.equal(verdictFromScore(75), 'strong');
  assert.equal(verdictFromScore(74), 'mixed');
  assert.equal(verdictFromScore(50), 'mixed');
  assert.equal(verdictFromScore(49), 'weak');
});

test('average of nothing is 0', () => {
  assert.equal(average([]), 0);
  assert.equal(average([60, 70]), 65);
});

test('uniqueNonEmpty trims, drops blanks and duplicates', () => {
  assert.deepEqual(uniqueNonEmpty([' a ', 'a', '', undefined, 'b']), ['a', 'b']);
});
