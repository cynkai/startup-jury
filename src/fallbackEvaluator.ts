import { AGENT_ROLES } from './agents.js';
import {
  AgentDebateTurn,
  AgentEvaluation,
  DebateTranscriptMessage,
  EvaluationResponse,
  FinalAssessment,
  ModeratorSummary,
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

function textOf(input: StartupIdeaInput): string {
  return [
    input.title,
    input.summary,
    input.targetCustomer,
    input.customerSegment,
    input.problem,
    input.solution,
    input.uniqueValue,
    input.revenueModel,
    input.pricingHint,
    input.acquisitionChannel,
    input.marketRegion,
    input.whyNow,
    input.teamStrength,
    input.mvpScope,
    ...(input.competitors || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function keywordScore(text: string, keywords: string[], points: number): number {
  return keywords.some((keyword) => text.includes(keyword)) ? points : 0;
}

function buildBreakdown(role: AgentEvaluation['role'], input: StartupIdeaInput): ScoreBreakdown {
  const text = textOf(input);
  const hasRevenue = Boolean(input.revenueModel);
  const hasCompetitors = Boolean(input.competitors?.length);
  const hasTarget = Boolean(input.targetCustomer || input.customerSegment);
  const hasProblem = Boolean(input.problem);
  const hasSolution = Boolean(input.solution);
  const hasUniqueValue = Boolean(input.uniqueValue);
  const hasPricing = Boolean(input.pricingHint);
  const hasAcquisition = Boolean(input.acquisitionChannel);
  const hasWhyNow = Boolean(input.whyNow);
  const hasTeam = Boolean(input.teamStrength);
  const hasMvp = Boolean(input.mvpScope);

  const problemClarity = clampScore(
    35 + (hasProblem ? 22 : 0) + (hasTarget ? 14 : 0) + (hasSolution ? 10 : 0) + (hasUniqueValue ? 8 : 0),
  );
  const marketAttractiveness = clampScore(
    34 + (hasTarget ? 16 : 0) + (hasCompetitors ? 12 : 0) + (hasWhyNow ? 10 : 0) + keywordScore(text, ['sme', 'founder', 'team', 'student', 'b2b'], 10),
  );
  const feasibility = clampScore(
    40 + (hasSolution ? 18 : 0) + (hasMvp ? 14 : 0) + (hasTeam ? 8 : 0) + keywordScore(text, ['ai', 'agent', 'automation', 'dashboard', 'analysis'], 10) - keywordScore(text, ['robot', 'drone', 'hardware', 'biotech'], 10),
  );
  const businessModelStrength = clampScore(
    30 + (hasRevenue ? 24 : 0) + (hasPricing ? 14 : 0) + keywordScore(text, ['subscription', 'saas', 'api', 'marketplace'], 14),
  );
  const growthPotential = clampScore(
    34 + (hasAcquisition ? 16 : 0) + (hasTarget ? 10 : 0) + (hasWhyNow ? 6 : 0) + keywordScore(text, ['team', 'workflow', 'daily', 'community', 'referral', 'platform'], 18),
  );
  const riskReadiness = clampScore(
    50 + (hasCompetitors ? 8 : -6) + (hasTeam ? 6 : 0) + (hasMvp ? 4 : 0) - keywordScore(text, ['medical', 'finance', 'trading', 'legal'], 15) - keywordScore(text, ['children', 'biometric', 'surveillance'], 10),
  );

  if (role === 'vc') {
    return {
      problemClarity,
      marketAttractiveness: clampScore(marketAttractiveness + 8),
      feasibility,
      businessModelStrength: clampScore(businessModelStrength + 10),
      growthPotential: clampScore(growthPotential + 8),
      riskReadiness,
    };
  }

  if (role === 'market') {
    return {
      problemClarity: clampScore(problemClarity + 6),
      marketAttractiveness: clampScore(marketAttractiveness + 12),
      feasibility,
      businessModelStrength,
      growthPotential: clampScore(growthPotential + 6),
      riskReadiness,
    };
  }

  if (role === 'tech') {
    return {
      problemClarity,
      marketAttractiveness,
      feasibility: clampScore(feasibility + 14),
      businessModelStrength,
      growthPotential,
      riskReadiness: clampScore(riskReadiness + 4),
    };
  }

  if (role === 'growth') {
    return {
      problemClarity,
      marketAttractiveness: clampScore(marketAttractiveness + 4),
      feasibility,
      businessModelStrength: clampScore(businessModelStrength + 4),
      growthPotential: clampScore(growthPotential + 14),
      riskReadiness,
    };
  }

  return {
    problemClarity,
    marketAttractiveness,
    feasibility,
    businessModelStrength,
    growthPotential,
    riskReadiness: clampScore(riskReadiness + 14),
  };
}

function evaluateRole(role: AgentEvaluation['role'], input: StartupIdeaInput): AgentEvaluation {
  const text = textOf(input);
  const hasRevenue = Boolean(input.revenueModel);
  const hasCompetitors = Boolean(input.competitors && input.competitors.length > 0);
  const hasTarget = Boolean(input.targetCustomer || input.customerSegment);
  const hasProblem = Boolean(input.problem);
  const hasUniqueValue = Boolean(input.uniqueValue);
  const hasAcquisition = Boolean(input.acquisitionChannel);
  const hasWhyNow = Boolean(input.whyNow);
  const hasTeam = Boolean(input.teamStrength);
  const hasPricing = Boolean(input.pricingHint);
  const hasMvp = Boolean(input.mvpScope);
  const breakdown = buildBreakdown(role, input);

  let score = average(Object.values(breakdown));

  if (role === 'vc') score += keywordScore(text, ['platform', 'saas', 'subscription', 'b2b', 'api'], 4);
  if (role === 'market') score += keywordScore(text, ['pain', 'problem', 'waste', 'fraud', 'inefficiency'], 4);
  if (role === 'tech') score -= keywordScore(text, ['hardware', 'robot', 'drone', 'biotech'], 4);
  if (role === 'risk') score -= keywordScore(text, ['medical', 'finance', 'trading', 'legal'], 5);

  score = clampScore(score);

  const strengths = uniqueNonEmpty([
    hasProblem ? '문제 정의가 어느 정도 명확함' : undefined,
    hasTarget ? '타깃 고객 또는 세그먼트가 구체적임' : undefined,
    hasRevenue ? '수익모델이 언급되어 있음' : undefined,
    hasPricing ? '가격 가설이 존재함' : undefined,
    hasUniqueValue ? '차별화 포인트가 언급되어 있음' : undefined,
    hasAcquisition ? '초기 유입 채널 가설이 있음' : undefined,
    hasWhyNow ? '왜 지금 해야 하는지에 대한 논리가 있음' : undefined,
    hasTeam ? '팀 강점이 정의되어 있음' : undefined,
    hasMvp ? 'MVP 범위가 비교적 구체적임' : undefined,
    text.includes('ai') || text.includes('agent') ? 'AI 활용 포인트가 비교적 분명함' : undefined,
    hasCompetitors ? '시장 내 비교 기준이 일부 존재함' : undefined,
  ]).slice(0, 4);

  const concerns = uniqueNonEmpty([
    !hasCompetitors ? '경쟁 서비스 분석이 부족함' : undefined,
    !hasRevenue ? '수익화 경로가 아직 약함' : undefined,
    !hasPricing ? '가격 정책 가설이 아직 없음' : undefined,
    !hasTarget ? '누가 첫 고객인지 더 선명해야 함' : undefined,
    !hasAcquisition ? '초기 유입 채널이 모호함' : undefined,
    !hasWhyNow ? '왜 지금 이 시장인지 설득 논리가 더 필요함' : undefined,
    !hasTeam ? '팀의 실행 강점을 보여줄 정보가 부족함' : undefined,
    !hasMvp ? 'MVP 범위가 넓어질 위험이 있음' : undefined,
    role === 'risk' && /(medical|finance|legal)/.test(text) ? '규제·책임 이슈 검토가 필요함' : undefined,
    role === 'growth' ? '첫 유입 채널과 재방문 구조를 더 구체화해야 함' : undefined,
  ]).slice(0, 4);

  const recommendations = uniqueNonEmpty([
    '초기 고객 인터뷰 5~10건으로 실제 pain point를 검증하기',
    hasCompetitors ? '경쟁사 대비 차별 포인트를 한 문장으로 정리하기' : '대체재/경쟁사 3개 이상을 조사하기',
    hasRevenue ? '가격 정책 가설을 세워 유료 전환 가능성을 테스트하기' : '유료화 시나리오를 하나로 좁혀보기',
    hasAcquisition ? '획득 채널 하나를 정해 실제 유입 실험을 설계하기' : '초기 유입 채널 하나를 먼저 정하고 측정 지표를 붙이기',
    hasMvp ? 'MVP 범위를 다시 점검해 1주 내 구현 가능한 수준으로 축소하기' : 'MVP 기능을 1~2개로 줄여 가장 검증 가치가 큰 흐름만 남기기',
  ]).slice(0, 3);

  const summaryMap = {
    vc: '투자 매력도 관점에서는 잠재력은 있으나, 더 선명한 차별화와 시장 증거가 필요합니다.',
    market: '시장 공감대는 있을 수 있지만, 문제 강도와 구매 의사를 더 검증해야 합니다.',
    tech: '기술적으로 MVP 구현은 가능해 보이며, 범위 통제가 핵심입니다.',
    growth: '성장성은 있으나 첫 유입 채널과 반복 사용 구조를 더 명확히 해야 합니다.',
    risk: '핵심 리스크는 신뢰성, 검증 부족, 그리고 특정 도메인 규제 가능성입니다.',
  } as const;

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
      strongest.role !== evaluation.role ? `${strongest.role} 관점의 낙관론은 더 많은 시장 근거가 있어야 설득력이 생깁니다.` : undefined,
      weakest.role !== evaluation.role ? `${weakest.role} 관점의 우려는 타당하지만 MVP 범위를 좁히면 일부 완화될 수 있습니다.` : undefined,
      evaluation.concerns[0] ? `현재 가장 큰 쟁점은 '${evaluation.concerns[0]}' 입니다.` : undefined,
    ]).slice(0, 2);

    const revisedScore = clampScore(evaluation.score + (agreesWith.length > 0 ? 2 : -2) + (evaluation.concerns.length === 0 ? 2 : -1));

    return {
      role: evaluation.role,
      stance,
      agreesWith,
      rebuttals,
      revisedScore,
      closingNote: `${evaluation.role} 에이전트는 ${evaluation.verdict} 의견을 유지하며, 다음 단계 검증이 투자 판단의 핵심이라고 봅니다.`,
    };
  });
}

function buildTranscript(
  input: StartupIdeaInput,
  evaluations: AgentEvaluation[],
  debate: AgentDebateTurn[],
  moderator: ModeratorSummary,
  finalAssessment: FinalAssessment,
): DebateTranscriptMessage[] {
  const messages: DebateTranscriptMessage[] = [];

  evaluations.forEach((evaluation, index) => {
    messages.push({
      id: `opening-${evaluation.role}`,
      speaker: evaluation.role,
      phase: 'opening',
      text: `${input.title}에 대한 제 1차 판단은 ${evaluation.score}점입니다. ${evaluation.summary} 강점은 ${evaluation.strengths.slice(0, 2).join(', ')} 쪽이고, 우려는 ${evaluation.concerns[0] || '아직 시장 근거가 충분치 않다는 점'}입니다.`,
    });

    const turn = debate.find((item) => item.role === evaluation.role);
    if (turn?.rebuttals?.length) {
      messages.push({
        id: `challenge-${evaluation.role}`,
        speaker: evaluation.role,
        phase: 'challenge',
        text: `다른 패널 의견을 검토해보면 ${turn.rebuttals.join(' ')} 그래서 수정 점수는 ${turn.revisedScore}점으로 보겠습니다.`,
      });
    }

    messages.push({
      id: `response-${evaluation.role}`,
      speaker: evaluation.role,
      phase: 'response',
      text: `${turn?.closingNote || `${evaluation.role} 에이전트는 현재 의견을 유지합니다.`} 다음 액션으로는 ${evaluation.recommendations[0] || '고객 검증'}이 가장 중요합니다.`,
    });

    if (index === 1) {
      messages.push({
        id: 'moderation-mid',
        speaker: 'moderator',
        phase: 'moderation',
        text: `현재까지 패널은 문제 정의와 초기 검증 필요성에는 대체로 동의하고 있습니다. 다만 ${moderator.disagreements[0] || '성장성과 리스크 해석'}에서 온도차가 있습니다.`,
      });
    }
  });

  messages.push({
    id: 'moderator-final',
    speaker: 'moderator',
    phase: 'moderation',
    text: `${moderator.finalReasoning} 패널 합의사항은 ${moderator.consensus.join(' / ')} 입니다.`,
  });

  messages.push({
    id: 'verdict-final',
    speaker: 'moderator',
    phase: 'verdict',
    text: `최종 판정은 ${finalAssessment.investmentVerdict.toUpperCase()}이며, 종합 점수는 ${finalAssessment.overallScore}점입니다. 바로 실행할 일은 ${finalAssessment.nextActions.slice(0, 2).join(' 그리고 ')}입니다.`,
  });

  return messages;
}

function buildModerator(input: StartupIdeaInput, evaluations: AgentEvaluation[], debate: AgentDebateTurn[]): ModeratorSummary {
  const consensus = uniqueNonEmpty([
    evaluations.some((item) => item.strengths.includes('문제 정의가 어느 정도 명확함')) ? '아이디어의 문제 정의는 비교적 명확하다.' : undefined,
    evaluations.some((item) => item.concerns.includes('경쟁 서비스 분석이 부족함')) ? '경쟁 구도 분석은 더 필요하다.' : undefined,
    evaluations.some((item) => item.concerns.includes('수익화 경로가 아직 약함')) ? '수익화 경로를 더 구체화해야 한다.' : undefined,
    evaluations.some((item) => item.concerns.includes('초기 유입 채널이 모호함')) ? '고객 획득 채널 검증이 중요하다.' : undefined,
    '초기 고객 검증이 다음 단계에서 가장 중요하다.',
  ]).slice(0, 4);

  const disagreements = uniqueNonEmpty([
    Math.max(...evaluations.map((item) => item.score)) - Math.min(...evaluations.map((item) => item.score)) >= 12
      ? '에이전트마다 투자 매력도와 실행 가능성에 대한 온도차가 있다.'
      : '대체로 유사한 평가를 내렸지만 성장성과 리스크 해석에는 차이가 있다.',
    debate.some((item) => item.stance === 'bearish') ? '일부 에이전트는 현재 단계에서 리스크를 더 크게 본다.' : undefined,
  ]).slice(0, 3);

  const avgDebateScore = clampScore(average(debate.map((item) => item.revisedScore)));

  return {
    consensus,
    disagreements,
    finalReasoning: `${input.title}는 초기 검증 가치가 충분하지만, 지금 당장 확신 있는 투자 판단을 내리기보다 고객 검증과 차별화 명확화가 우선입니다.`,
    confidence: clampScore(avgDebateScore - (disagreements.length > 1 ? 8 : 3)),
  };
}

function aggregate(input: StartupIdeaInput, evaluations: AgentEvaluation[], debate: AgentDebateTurn[]): FinalAssessment {
  const overallScore = clampScore(average(debate.map((item) => item.revisedScore)));
  const topStrengths = uniqueNonEmpty(evaluations.flatMap((item) => item.strengths)).slice(0, 4);
  const topRisks = uniqueNonEmpty(evaluations.flatMap((item) => item.concerns)).slice(0, 4);

  return {
    overallScore,
    investmentVerdict: investmentVerdictFromScore(overallScore),
    oneLiner: `${input.title}는 ${input.targetCustomer || input.customerSegment || '명확한 고객군'}을 위한 아이디어로, 초기 검증 가치가 있지만 시장 근거를 더 쌓아야 합니다.`,
    topStrengths,
    topRisks,
    nextActions: [
      '핵심 고객군 5명 이상 인터뷰하고 가장 강한 문제를 재정의하기',
      '경쟁 서비스 3개와 비교해 차별점·대체재·가격을 정리하기',
      '2주 안에 검증 가능한 MVP 기능 1~2개만 남기기',
      '첫 유입 채널 1개를 정하고 랜딩 페이지나 데모로 반응을 측정하기',
    ],
  };
}

export function evaluateWithFallback(input: StartupIdeaInput): EvaluationResponse {
  const evaluations = AGENT_ROLES.map((role) => evaluateRole(role, input));
  const debate = buildDebate(evaluations);
  const moderator = buildModerator(input, evaluations, debate);
  const finalAssessment = aggregate(input, evaluations, debate);
  const transcript = buildTranscript(input, evaluations, debate, moderator, finalAssessment);

  return {
    input,
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
