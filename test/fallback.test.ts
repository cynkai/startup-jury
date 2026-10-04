import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AGENT_ROLES } from '../src/agents.js';
import { evaluateWithFallback } from '../src/fallbackEvaluator.js';
import { scenarioPresets } from '../src/scenarios.js';
import { startupIdeaSchema } from '../src/schema.js';
import { average, clampScore, investmentVerdictFromScore } from '../src/utils.js';

for (const scenario of scenarioPresets) {
  test(`rule-based evaluation of scenario "${scenario.id}" is complete and consistent`, () => {
    assert.ok(startupIdeaSchema.safeParse(scenario.idea).success, 'scenario passes request validation');

    const result = evaluateWithFallback(scenario.idea);
    assert.equal(result.meta.usedLLM, false);
    assert.deepEqual(result.evaluations.map((e) => e.role), AGENT_ROLES);
    assert.deepEqual(result.debate.map((d) => d.role), AGENT_ROLES);

    for (const evaluation of result.evaluations) {
      assert.ok(evaluation.score >= 0 && evaluation.score <= 100);
      assert.equal(evaluation.score, clampScore(average(Object.values(evaluation.scoreBreakdown))));
    }

    const { overallScore, investmentVerdict } = result.finalAssessment;
    assert.equal(overallScore, clampScore(average(result.debate.map((d) => d.revisedScore))));
    assert.equal(investmentVerdict, investmentVerdictFromScore(overallScore));
    assert.ok(result.transcript.length > 0);
    assert.equal(result.transcript.at(-1)?.phase, 'verdict');
  });
}

test('rule-based evaluation is deterministic', () => {
  const idea = scenarioPresets[0].idea;
  const a = evaluateWithFallback(idea);
  const b = evaluateWithFallback(idea);
  assert.deepEqual({ ...a, meta: null }, { ...b, meta: null });
});

test('a pitch with more business detail scores higher than a bare one', () => {
  const bare = evaluateWithFallback({ title: 'Idea', pitch: 'An app for people who like plants.' });
  const detailed = evaluateWithFallback({
    title: 'Idea',
    pitch:
      'Busy office workers struggle to keep plants alive (problem). Our app reminds them and recommends care (solution). Subscription at $5 per month, first users from Reddit plant communities, MVP is reminders only.',
  });
  assert.ok(detailed.finalAssessment.overallScore > bare.finalAssessment.overallScore);
});
