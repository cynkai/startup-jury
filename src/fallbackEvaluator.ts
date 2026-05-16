import { AGENT_ROLES } from './agents.js';
import { normalizeIdea } from './normalize.js';
import {
  AgentDebateTurn,
  AgentEvaluation,
  AgentRole,
  DebateTranscriptMessage,
  EvaluationResponse,
  FinalAssessment,
  ModeratorSummary,
  NormalizedIdea,
  ScoreBreakdown,
  StartupIdeaInput,
} from './types.js';
import {
  average,
  clampScore,
  investmentVerdictFromScore,
  uniqueNonEmpty,
  verdictFromScore,
} from './utils.js';

const ROLE_LABEL: Record<AgentRole, string> = {
  vc: 'VC Agent',
  market: 'Market Agent',
  tech: 'Tech Agent',
  growth: 'Growth Agent',
  risk: 'Risk Agent',
};

function buildBreakdown(role: AgentRole, idea: NormalizedIdea): ScoreBreakdown {
  const s = idea.signals;
  const problemClarity = clampScore(
    36 + (s.hasProblem ? 22 : 0) + (s.hasTarget ? 14 : 0) + (s.hasSolution ? 12 : 0),
  );
  const marketAttractiveness = clampScore(
    34 + (s.hasTarget ? 16 : 0) + (s.hasCompetition ? 10 : 0) + (s.hasWhyNow ? 12 : 0) + (s.isB2b ? 8 : 0),
  );
  const feasibility = clampScore(
    44 + (s.hasSolution ? 14 : 0) + (s.hasMvp ? 14 : 0) + (s.hasTeam ? 6 : 0) + (s.isAiNative ? 8 : 0) - (s.isHardware ? 12 : 0),
  );
  const businessModelStrength = clampScore(
    32 + (s.hasRevenue ? 22 : 0) + (s.hasPricing ? 14 : 0) + (s.isB2b ? 10 : 0) + (s.isMarketplace ? 6 : 0),
  );
  const growthPotential = clampScore(
    34 + (s.hasAcquisition ? 18 : 0) + (s.hasTarget ? 10 : 0) + (s.mentionsCommunity ? 10 : 0) + (s.isMarketplace ? 6 : 0),
  );
  const riskReadiness = clampScore(
    52 + (s.hasCompetition ? 6 : -4) + (s.hasTeam ? 6 : 0) + (s.hasMvp ? 4 : 0) - (s.isRegulated ? 14 : 0) - (s.isHardware ? 6 : 0),
  );

  const base: ScoreBreakdown = {
    problemClarity,
    marketAttractiveness,
    feasibility,
    businessModelStrength,
    growthPotential,
    riskReadiness,
  };

  switch (role) {
    case 'vc':
      return {
        ...base,
        marketAttractiveness: clampScore(base.marketAttractiveness + 6),
        businessModelStrength: clampScore(base.businessModelStrength + 10),
        growthPotential: clampScore(base.growthPotential + 6),
      };
    case 'market':
      return {
        ...base,
        problemClarity: clampScore(base.problemClarity + 6),
        marketAttractiveness: clampScore(base.marketAttractiveness + 12),
      };
    case 'tech':
      return {
        ...base,
        feasibility: clampScore(base.feasibility + 14),
        riskReadiness: clampScore(base.riskReadiness + 4),
      };
    case 'growth':
      return {
        ...base,
        growthPotential: clampScore(base.growthPotential + 14),
        businessModelStrength: clampScore(base.businessModelStrength + 4),
      };
    case 'risk':
      return {
        ...base,
        riskReadiness: clampScore(base.riskReadiness + 14),
      };
    default:
      return base;
  }
}

function evaluateRole(role: AgentRole, idea: NormalizedIdea): AgentEvaluation {
  const breakdown = buildBreakdown(role, idea);
  const score = clampScore(average(Object.values(breakdown)));
  const s = idea.signals;

  const strengths = uniqueNonEmpty([
    s.hasProblem ? '풀려는 문제가 글 안에서 비교적 명확하게 드러난다.' : undefined,
    s.hasTarget ? '타깃 사용자 그림이 보인다.' : undefined,
    s.hasSolution ? '해결 방식이 추상적으로라도 제시되어 있다.' : undefined,
    s.hasRevenue || s.hasPricing ? '수익화에 대한 단서가 있다.' : undefined,
    s.isAiNative ? 'AI 활용 방향이 자연스럽게 들어가 있다.' : undefined,
    s.hasWhyNow ? '왜 지금 해야 하는지 시그널이 있다.' : undefined,
    s.hasAcquisition ? '초기 유입 채널을 떠올리고 있다.' : undefined,
  ]).slice(0, 4);

  const concerns = uniqueNonEmpty([
    !s.hasTarget ? '누가 첫 사용자인지 더 분명히 해야 한다.' : undefined,
    !s.hasRevenue ? '돈이 어디서 나오는지 아직 약하다.' : undefined,
    !s.hasCompetition ? '대체재/경쟁 서비스에 대한 인식이 거의 안 보인다.' : undefined,
    !s.hasMvp ? 'MVP 범위가 넓어질 위험이 있다.' : undefined,
    !s.hasAcquisition ? '첫 유저를 어떻게 데려올지 모호하다.' : undefined,
    s.isRegulated ? '규제/책임 이슈를 더 검토해야 한다.' : undefined,
    s.isHardware ? '하드웨어 의존도가 실행 난이도를 올린다.' : undefined,
  ]).slice(0, 4);

  const recommendations = uniqueNonEmpty([
    '핵심 사용자 5~10명 인터뷰로 진짜 통증을 검증한다.',
    s.hasCompetition ? '경쟁사 대비 한 줄 차별점을 명확히 한다.' : '대체재 3개와 비교 표를 만든다.',
    s.hasRevenue ? '가격 가설을 세워 결제 의향을 빠르게 테스트한다.' : '유료화 시나리오를 하나로 좁힌다.',
    s.hasAcquisition ? '첫 유입 채널 한 곳에서 작은 실험을 돌린다.' : '첫 유입 채널 1개를 가설로 정한다.',
    'MVP 기능을 1~2개로 줄여 2주 안에 보여줄 수 있는 데모를 만든다.',
  ]).slice(0, 3);

  const summaryMap: Record<AgentRole, string> = {
    vc: '투자 관점에서는 잠재력은 있지만 차별화와 시장 증거가 더 필요합니다.',
    market: '시장 공감대는 보이지만 통증의 강도와 구매 의사를 더 검증해야 합니다.',
    tech: '기술적으로 MVP 구현은 가능해 보이며 범위 통제가 핵심입니다.',
    growth: '성장성은 있지만 첫 유입과 반복 사용 구조를 더 구체화해야 합니다.',
    risk: '핵심 리스크는 신뢰성, 검증 부족, 그리고 도메인 규제 가능성입니다.',
  };

  return {
    role,
    score,
    verdict: verdictFromScore(score),
    summary: summaryMap[role],
    strengths,
    concerns,
    recommendations,
    scoreBreakdown: breakdown,
  };
}

function buildDebate(evaluations: AgentEvaluation[]): AgentDebateTurn[] {
  const strongest = [...evaluations].sort((a, b) => b.score - a.score)[0];
  const weakest = [...evaluations].sort((a, b) => a.score - b.score)[0];

  return evaluations.map((evaluation) => {
    const stance: AgentDebateTurn['stance'] =
      evaluation.score >= 75 ? 'bullish' : evaluation.score >= 55 ? 'neutral' : 'bearish';
    const agreesWith = evaluations
      .filter((other) => other.role !== evaluation.role && Math.abs(other.score - evaluation.score) <= 8)
      .map((other) => other.role)
      .slice(0, 2);
    const rebuttals = uniqueNonEmpty([
      strongest.role !== evaluation.role
        ? `${ROLE_LABEL[strongest.role]}의 낙관론은 시장 근거가 더 필요합니다.`
        : undefined,
      weakest.role !== evaluation.role
        ? `${ROLE_LABEL[weakest.role]}의 우려는 MVP 범위를 좁히면 일부 완화됩니다.`
        : undefined,
      evaluation.concerns[0] ? `지금 가장 큰 쟁점은 ${evaluation.concerns[0]}입니다.` : undefined,
    ]).slice(0, 2);

    const revisedScore = clampScore(
      evaluation.score + (agreesWith.length > 0 ? 2 : -2) + (evaluation.concerns.length === 0 ? 2 : -1),
    );

    return {
      role: evaluation.role,
      stance,
      agreesWith,
      rebuttals,
      revisedScore,
      closingNote: `${ROLE_LABEL[evaluation.role]}는 ${evaluation.verdict} 의견을 유지합니다.`,
    };
  });
}

function buildModerator(idea: NormalizedIdea, evaluations: AgentEvaluation[], debate: AgentDebateTurn[]): ModeratorSummary {
  const consensus = uniqueNonEmpty([
    evaluations.some((item) => item.strengths.some((s) => s.includes('문제'))) ? '문제 정의는 어느 정도 명확하다.' : undefined,
    evaluations.some((item) => item.concerns.some((c) => c.includes('수익'))) ? '수익화 경로는 더 구체화해야 한다.' : undefined,
    evaluations.some((item) => item.concerns.some((c) => c.includes('경쟁'))) ? '경쟁/대체재 분석이 추가로 필요하다.' : undefined,
    evaluations.some((item) => item.concerns.some((c) => c.includes('첫 유'))) ? '초기 사용자 확보 채널을 더 다듬어야 한다.' : undefined,
    '다음 단계는 빠른 고객 검증이다.',
  ]).slice(0, 4);

  const range = Math.max(...evaluations.map((e) => e.score)) - Math.min(...evaluations.map((e) => e.score));
  const disagreements = uniqueNonEmpty([
    range >= 12
      ? '에이전트마다 투자 매력도에 대한 온도차가 분명히 있다.'
      : '큰 방향은 비슷하지만 성장성과 리스크 해석에 차이가 있다.',
    debate.some((d) => d.stance === 'bearish') ? '일부 에이전트는 현재 단계에서 리스크를 더 크게 본다.' : undefined,
  ]).slice(0, 3);

  const avgDebateScore = clampScore(average(debate.map((d) => d.revisedScore)));

  return {
    consensus,
    disagreements,
    finalReasoning: `${idea.title}는 초기 검증 가치는 충분하지만 지금 당장 확신 있는 투자 판단보다는 고객 검증과 차별화 정의를 먼저 끝내는 것이 합리적입니다.`,
    confidence: clampScore(avgDebateScore - (disagreements.length > 1 ? 8 : 3)),
  };
}

function aggregate(idea: NormalizedIdea, evaluations: AgentEvaluation[], debate: AgentDebateTurn[]): FinalAssessment {
  const overallScore = clampScore(average(debate.map((d) => d.revisedScore)));
  const topStrengths = uniqueNonEmpty(evaluations.flatMap((e) => e.strengths)).slice(0, 4);
  const topRisks = uniqueNonEmpty(evaluations.flatMap((e) => e.concerns)).slice(0, 4);

  return {
    overallScore,
    investmentVerdict: investmentVerdictFromScore(overallScore),
    oneLiner: `${idea.title}는 ${idea.signals.hasTarget ? '비교적 분명한 사용자 그룹' : '아직 모호한 사용자 그룹'}을 향한 아이디어로, 빠른 시장 검증 가치는 있다.`,
    topStrengths,
    topRisks,
    nextActions: [
      '핵심 사용자 5명 이상 인터뷰로 가장 강한 문제를 찾는다.',
      '대체재 3개와 비교해 한 줄 차별점을 정의한다.',
      '2주 안에 시연 가능한 MVP 1~2개 기능만 남긴다.',
      '첫 유입 채널 한 곳에서 작은 실험을 돌린다.',
    ],
  };
}

function findTurn(debate: AgentDebateTurn[], role: AgentRole): AgentDebateTurn | undefined {
  return debate.find((d) => d.role === role);
}

function buildTranscript(
  idea: NormalizedIdea,
  evaluations: AgentEvaluation[],
  debate: AgentDebateTurn[],
  moderator: ModeratorSummary,
  finalAssessment: FinalAssessment,
): DebateTranscriptMessage[] {
  const byRole = Object.fromEntries(evaluations.map((e) => [e.role, e])) as Record<AgentRole, AgentEvaluation>;
  const messages: DebateTranscriptMessage[] = [];

  messages.push({
    id: 'mod-open',
    speaker: 'moderator',
    phase: 'moderation',
    text: `오늘 안건은 "${idea.title}"입니다. VC, Market, Tech, Growth, Risk 다섯 에이전트의 의견을 차례로 듣고 토론하겠습니다.`,
  });

  messages.push({
    id: 'open-vc',
    speaker: 'vc',
    phase: 'opening',
    text: `투자 관점에서는 ${byRole.vc.score}점입니다. ${byRole.vc.summary} ${byRole.vc.strengths[0] || ''}`.trim(),
  });

  messages.push({
    id: 'open-market',
    speaker: 'market',
    phase: 'opening',
    addressedTo: 'vc',
    text: `VC 의견 잘 들었습니다. 다만 시장 관점에서는 더 신중합니다. ${byRole.market.summary} 특히 ${byRole.market.concerns[0] || '실제 통증의 강도'}가 가장 큰 변수라고 봅니다.`,
  });

  messages.push({
    id: 'rebut-vc-market',
    speaker: 'vc',
    phase: 'challenge',
    addressedTo: 'market',
    text: `Market 의견에 한 가지 반박하겠습니다. 사용자의 구매 의사가 약하더라도, ${idea.signals.hasRevenue ? '제시된 수익 모델' : '구독 기반 모델'} 자체는 작은 세그먼트에서도 작동할 수 있습니다. ${findTurn(debate, 'vc')?.rebuttals?.[0] || ''}`.trim(),
  });

  messages.push({
    id: 'open-tech',
    speaker: 'tech',
    phase: 'opening',
    addressedTo: 'moderator',
    text: `기술 쪽에서 말하자면 ${byRole.tech.score}점입니다. ${byRole.tech.summary} ${idea.signals.isAiNative ? 'AI 활용 자체는 자연스러워 보입니다.' : '기술 난이도는 평이합니다.'}`,
  });

  messages.push({
    id: 'rebut-risk-tech',
    speaker: 'risk',
    phase: 'challenge',
    addressedTo: 'tech',
    text: `Tech의 낙관에 대해 한 가지 짚겠습니다. ${idea.signals.isRegulated ? '규제 도메인 가능성' : '신뢰성·검증 부담'}이 있으면 같은 기능이라도 실행 난이도가 올라갑니다. ${findTurn(debate, 'risk')?.rebuttals?.[0] || ''}`.trim(),
  });

  messages.push({
    id: 'open-growth',
    speaker: 'growth',
    phase: 'opening',
    addressedTo: 'risk',
    text: `Risk 의견에 일부 공감하지만 성장 관점도 봐야 합니다. ${byRole.growth.summary} ${idea.signals.hasAcquisition ? '획득 채널 가설이 있는 점은 긍정적입니다.' : '첫 유입 채널 가설을 더 분명히 세워야 합니다.'}`,
  });

  messages.push({
    id: 'rebut-market-growth',
    speaker: 'market',
    phase: 'response',
    addressedTo: 'growth',
    text: `Growth의 의견을 받아 다시 말하면, 시장 자체가 작더라도 ${idea.signals.isB2b ? 'B2B 시장은 가격이 견고하다는 장점' : '커뮤니티 기반 확산이라는 장점'}이 있습니다. 다만 첫 30명 사용자 시나리오는 더 구체적이어야 합니다.`,
  });

  messages.push({
    id: 'mod-mid',
    speaker: 'moderator',
    phase: 'moderation',
    text: `잠깐 정리하면, 패널은 ${moderator.consensus[0] || '문제 정의의 명확성'}에는 어느 정도 동의했지만 ${moderator.disagreements[0] || '리스크와 성장성 해석'}에서 의견이 갈리고 있습니다.`,
  });

  messages.push({
    id: 'final-vc',
    speaker: 'vc',
    phase: 'response',
    addressedTo: 'moderator',
    text: `종합해서 VC 쪽은 ${findTurn(debate, 'vc')?.revisedScore || byRole.vc.score}점으로 갱신합니다. 차별화 정의와 가격 가설 검증이 핵심이 될 겁니다.`,
  });

  messages.push({
    id: 'final-risk',
    speaker: 'risk',
    phase: 'response',
    addressedTo: 'moderator',
    text: `Risk 쪽은 ${findTurn(debate, 'risk')?.revisedScore || byRole.risk.score}점입니다. ${byRole.risk.concerns[0] || '검증 부족'}이 해결되지 않으면 같은 점수를 유지할 겁니다.`,
  });

  messages.push({
    id: 'mod-verdict',
    speaker: 'moderator',
    phase: 'verdict',
    text: `최종 판정은 ${finalAssessment.investmentVerdict.toUpperCase()}입니다. 종합 점수 ${finalAssessment.overallScore}점, 모더레이터 신뢰도 ${moderator.confidence}점. 다음 2주 안의 우선 액션은 "${finalAssessment.nextActions[0]}"입니다.`,
  });

  return messages;
}

export function evaluateWithFallback(input: StartupIdeaInput): EvaluationResponse {
  const idea = normalizeIdea(input);
  const evaluations = AGENT_ROLES.map((role) => evaluateRole(role, idea));
  const debate = buildDebate(evaluations);
  const moderator = buildModerator(idea, evaluations, debate);
  const finalAssessment = aggregate(idea, evaluations, debate);
  const transcript = buildTranscript(idea, evaluations, debate, moderator, finalAssessment);

  return {
    input,
    normalized: idea,
    evaluations,
    debate,
    transcript,
    moderator,
    finalAssessment,
    meta: {
      usedLLM: false,
      generatedAt: new Date().toISOString(),
    },
  };
}
