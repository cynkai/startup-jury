import {
  AgentDebateTurn,
  AgentEvaluation,
  DebateTranscriptMessage,
  FinalAssessment,
  ModeratorSummary,
  NormalizedIdea,
} from './types.js';

/**
 * Builds the chat-style transcript from what the agents actually produced:
 * opening evaluations, debate turns in speaking order, and the moderator's
 * summary. Only the moderator's opening and verdict lines are fixed text.
 */
export function buildTranscript(
  idea: NormalizedIdea,
  evaluations: AgentEvaluation[],
  debate: AgentDebateTurn[],
  moderator: ModeratorSummary,
  finalAssessment: FinalAssessment,
): DebateTranscriptMessage[] {
  const messages: DebateTranscriptMessage[] = [
    {
      id: 'mod-open',
      speaker: 'moderator',
      phase: 'moderation',
      text: `오늘 안건은 "${idea.title}"입니다. 다섯 심사위원의 1차 평가를 듣고 토론하겠습니다.`,
    },
  ];

  for (const evaluation of evaluations) {
    messages.push({
      id: `open-${evaluation.role}`,
      speaker: evaluation.role,
      phase: 'opening',
      text: `${evaluation.score}점. ${evaluation.summary}`,
    });
  }

  debate.forEach((turn, index) => {
    messages.push({
      id: `debate-${turn.round}-${turn.role}-${index}`,
      speaker: turn.role,
      phase: turn.round === 1 ? 'challenge' : 'response',
      addressedTo: turn.addressedTo,
      text: `${turn.message} (수정 점수 ${turn.revisedScore})`,
    });
  });

  messages.push({
    id: 'mod-summary',
    speaker: 'moderator',
    phase: 'moderation',
    text: moderator.finalReasoning,
  });

  const { investmentVerdict, scoreVerdict, overallScore } = finalAssessment;
  const differs = investmentVerdict !== scoreVerdict ? ` (점수 기준으로는 ${scoreVerdict.toUpperCase()})` : '';
  messages.push({
    id: 'mod-verdict',
    speaker: 'moderator',
    phase: 'verdict',
    text: `최종 판정은 ${investmentVerdict.toUpperCase()}${differs}입니다. 종합 점수 ${overallScore}점, 모더레이터 신뢰도 ${moderator.confidence}점.`,
  });

  return messages;
}
