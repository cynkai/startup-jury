import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeIdea } from '../src/normalize.js';

function signals(pitch: string) {
  return normalizeIdea({ title: 'Test', pitch }).signals;
}

test('Latin keywords match whole words only', () => {
  assert.equal(signals('We send a weekly email digest to paid members.').isAiNative, false);
  assert.equal(signals('An AI agent drafts the reply.').isAiNative, true);
  assert.equal(signals('Multiple agents review the pitch.').isAiNative, true);
  assert.equal(signals('First city is Seoul.').hasAcquisition, false);
  assert.equal(signals('Grow through SEO and Reddit.').hasAcquisition, true);
  assert.equal(signals('Customers leave feedback after each visit.').hasRevenue, false);
  assert.equal(signals('We charge a small booking fee.').hasRevenue, true);
});

test('Korean keywords still match with particles attached', () => {
  assert.equal(signals('직장인이 겪는 문제를 해결한다.').hasProblem, true);
  assert.equal(signals('커뮤니티에서 첫 사용자를 모은다.').hasAcquisition, true);
});

test('a month name or a reservation is not a revenue or regulation signal', () => {
  const s = signals('3월 출시 예정인 미용실 예약 앱을 요약하면 이렇다.');
  assert.equal(s.hasRevenue, false);
  assert.equal(s.hasPricing, false);
  assert.equal(s.isRegulated, false);
});

test('prices are detected in Korean and English', () => {
  assert.equal(signals('멤버십 월 9만 원으로 운영한다.').hasPricing, true);
  assert.equal(signals('멤버십 월 9만 원으로 운영한다.').hasRevenue, true);
  assert.equal(signals('팀 플랜은 29달러다.').hasPricing, true);
  assert.equal(signals('Team plan costs $29.').hasPricing, true);
});

test('regulated domains are detected', () => {
  assert.equal(signals('처방전을 약국에 전달하는 서비스').isRegulated, true);
  assert.equal(signals('A fintech app for freelancers').isRegulated, true);
});
