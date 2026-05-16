import { AGENT_ROLES } from './agents.js';
import { AgentEvaluation, EvaluationResponse, FinalAssessment, StartupIdeaInput } from './types.js';
import { clampScore, investmentVerdictFromScore, uniqueNonEmpty, verdictFromScore } from './utils.js';

function textOf(input: StartupIdeaInput): string {
  return [
    input.title,
    input.summary,
    input.targetCustomer,
    input.problem,
    input.solution,
    input.revenueModel,
    input.marketRegion,
    ...(input.competitors || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function keywordScore(text: string, keywords: string[], points: number): number {
  return keywords.some((keyword) => text.includes(keyword)) ? points : 0;
}

function evaluateRole(role: AgentEvaluation['role'], input: StartupIdeaInput): AgentEvaluation {
  const text = textOf(input);
  const hasRevenue = Boolean(input.revenueModel);
  const hasCompetitors = Boolean(input.competitors && input.competitors.length > 0);
  const hasTarget = Boolean(input.targetCustomer);
  const hasProblem = Boolean(input.problem);
  const hasSolution = Boolean(input.solution);

  let score = 45;
  score += hasRevenue ? 10 : 0;
  score += hasCompetitors ? 8 : 0;
  score += hasTarget ? 8 : 0;
  score += hasProblem ? 8 : 0;
  score += hasSolution ? 8 : 0;

  if (role === 'vc') {
    score += keywordScore(text, ['platform', 'saas', 'subscription', 'b2b', 'api'], 8);
    score += keywordScore(text, ['network effect', 'automation', 'marketplace'], 6);
  }
  if (role === 'market') {
    score += keywordScore(text, ['pain', 'problem', 'waste', 'fraud', 'inefficiency'], 8);
    score += keywordScore(text, ['student', 'founder', 'sme', 'team', 'creator'], 6);
  }
  if (role === 'tech') {
    score += keywordScore(text, ['ai', 'agent', 'automation', 'analysis', 'dashboard'], 8);
    score -= keywordScore(text, ['hardware', 'robot', 'drone', 'biotech'], 10);
  }
  if (role === 'growth') {
    score += keywordScore(text, ['community', 'viral', 'referral', 'seo', 'content'], 8);
    score += keywordScore(text, ['workflow', 'daily', 'habit', 'team'], 6);
  }
  if (role === 'risk') {
    score -= keywordScore(text, ['medical', 'finance', 'trading', 'legal'], 10);
    score -= keywordScore(text, ['children', 'biometric', 'surveillance'], 8);
    score += hasCompetitors ? 4 : -4;
  }

  score = clampScore(score);

  const strengths = uniqueNonEmpty([
    hasProblem ? '문제 정의가 어느 정도 명확함' : undefined,
    hasTarget ? '타깃 고객이 구체적임' : undefined,
    hasRevenue ? '수익모델이 언급되어 있음' : undefined,
    text.includes('ai') || text.includes('agent') ? 'AI 활용 포인트가 비교적 분명함' : undefined,
  ]);

  const concerns = uniqueNonEmpty([
    !hasCompetitors ? '경쟁 서비스 분석이 부족함' : undefined,
    !hasRevenue ? '수익화 경로가 아직 약함' : undefined,
    !hasTarget ? '누가 첫 고객인지 더 선명해야 함' : undefined,
    role === 'risk' && /(medical|finance|legal)/.test(text) ? '규제·책임 이슈 검토가 필요함' : undefined,
  ]);

  const recommendations = uniqueNonEmpty([
    '초기 고객 인터뷰 5~10건으로 실제 pain point를 검증하기',
    hasCompetitors ? '경쟁사 대비 차별 포인트를 한 문장으로 정리하기' : '대체재/경쟁사 3개 이상을 조사하기',
    hasRevenue ? '가격 정책 가설을 세워 유료 전환 가능성을 테스트하기' : '유료화 시나리오를 하나로 좁혀보기',
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
  };
}

function aggregate(input: StartupIdeaInput, evaluations: AgentEvaluation[]): FinalAssessment {
  const overallScore = clampScore(
    evaluations.reduce((sum, item) => sum + item.score, 0) / evaluations.length,
  );

  const topStrengths = uniqueNonEmpty(evaluations.flatMap((item) => item.strengths)).slice(0, 4);
  const topRisks = uniqueNonEmpty(evaluations.flatMap((item) => item.concerns)).slice(0, 4);

  return {
    overallScore,
    investmentVerdict: investmentVerdictFromScore(overallScore),
    oneLiner: `${input.title}는 ${input.targetCustomer || '명확한 고객군'}을 위한 아이디어로, 초기 검증 가치가 있지만 시장 근거를 더 쌓아야 합니다.`,
    topStrengths,
    topRisks,
    nextActions: [
      '핵심 고객군 5명 이상 인터뷰하고 가장 강한 문제를 재정의하기',
      '경쟁 서비스 3개와 비교해 차별점·대체재·가격을 정리하기',
      '2주 안에 검증 가능한 MVP 기능 1~2개만 남기기',
    ],
  };
}

export function evaluateWithFallback(input: StartupIdeaInput): EvaluationResponse {
  const evaluations = AGENT_ROLES.map((role) => evaluateRole(role, input));
  const finalAssessment = aggregate(input, evaluations);

  return {
    input,
    evaluations,
    finalAssessment,
    meta: {
      usedLLM: false,
      generatedAt: new Date().toISOString(),
    },
  };
}
