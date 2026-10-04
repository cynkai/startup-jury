import { AGENT_ROLES } from './agents.js';
import { normalizeIdea } from './normalize.js';
import { buildTranscript } from './transcript.js';
import {
  AgentDebateTurn,
  AgentEvaluation,
  AgentRole,
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
    const addressedTo = strongest.role !== evaluation.role ? strongest.role : weakest.role;
    const rebuttals = uniqueNonEmpty([
      strongest.role !== evaluation.role
        ? `${ROLE_LABEL[strongest.role]}의 낙관론은 시장 근거가 더 필요합니다.`
        : undefined,
      weakest.role !== evaluation.role
        ? `${ROLE_LABEL[weakest.role]}의 우려는 MVP 범위를 좁히면 일부 완화됩니다.`
        : undefined,
      evaluation.concerns[0] ? `지금 가장 큰 쟁점: ${evaluation.concerns[0]}` : undefined,
    ]).slice(0, 2);

    const revisedScore = clampScore(
      evaluation.score + (agreesWith.length > 0 ? 2 : -2) + (evaluation.concerns.length === 0 ? 2 : -1),
    );

    return {
      role: evaluation.role,
      round: 1,
      addressedTo,
      message: rebuttals.join(' '),
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
    verdict: investmentVerdictFromScore(avgDebateScore),
  };
}

function aggregate(idea: NormalizedIdea, evaluations: AgentEvaluation[], debate: AgentDebateTurn[]): FinalAssessment {
  const overallScore = clampScore(average(debate.map((d) => d.revisedScore)));
  const topStrengths = uniqueNonEmpty(evaluations.flatMap((e) => e.strengths)).slice(0, 4);
  const topRisks = uniqueNonEmpty(evaluations.flatMap((e) => e.concerns)).slice(0, 4);

  return {
    overallScore,
    investmentVerdict: investmentVerdictFromScore(overallScore),
    scoreVerdict: investmentVerdictFromScore(overallScore),
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
      debateRounds: 1,
    },
  };
}
