import { AGENT_DEFINITIONS, AGENT_ROLES } from './agents.js';
import { config } from './config.js';
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
import { average, clampScore, investmentVerdictFromScore, uniqueNonEmpty, verdictFromScore } from './utils.js';

interface LlmAgentResponse {
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  score: number;
  scoreBreakdown?: Partial<ScoreBreakdown>;
}

interface LlmDebateResponse {
  stance: 'bullish' | 'neutral' | 'bearish';
  agreesWith: string[];
  rebuttals: string[];
  revisedScore: number;
  closingNote: string;
}

interface LlmModeratorResponse {
  consensus: string[];
  disagreements: string[];
  finalReasoning: string;
  confidence: number;
}

async function chatJson<T>(system: string, user: string): Promise<T> {
  const response = await fetch(`${config.openAiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openAiApiKey}`,
    },
    body: JSON.stringify({
      model: config.openAiModel,
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content from model');
  return JSON.parse(content) as T;
}

function normalizeBreakdown(partial?: Partial<ScoreBreakdown>): ScoreBreakdown {
  return {
    problemClarity: clampScore(Number(partial?.problemClarity) || 60),
    marketAttractiveness: clampScore(Number(partial?.marketAttractiveness) || 60),
    feasibility: clampScore(Number(partial?.feasibility) || 60),
    businessModelStrength: clampScore(Number(partial?.businessModelStrength) || 60),
    growthPotential: clampScore(Number(partial?.growthPotential) || 60),
    riskReadiness: clampScore(Number(partial?.riskReadiness) || 60),
  };
}

async function evaluateAgent(idea: NormalizedIdea, role: AgentRole): Promise<AgentEvaluation> {
  const agent = AGENT_DEFINITIONS[role];
  const parsed = await chatJson<LlmAgentResponse>(
    'You are a precise startup evaluator that outputs strict JSON only.',
    `You are ${agent.name}. Focus on ${agent.focus}. The founder gives only a title and short pitch text. Evaluate this startup pitch and infer the unknowns reasonably. Return ONLY valid JSON with keys: summary, strengths, concerns, recommendations, score, scoreBreakdown. score is 0-100. scoreBreakdown keys: problemClarity, marketAttractiveness, feasibility, businessModelStrength, growthPotential, riskReadiness.\n\nIdea title: ${idea.title}\nPitch: ${idea.pitch}\nNotes: ${idea.notes || '(none)'}\n\nKeep recommendations actionable.`,
  );

  const score = clampScore(Number(parsed.score) || 0);
  return {
    role,
    score,
    verdict: verdictFromScore(score),
    summary: parsed.summary,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
    concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 4) : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : [],
    scoreBreakdown: normalizeBreakdown(parsed.scoreBreakdown),
  };
}

async function debateAgent(
  idea: NormalizedIdea,
  evaluation: AgentEvaluation,
  evaluations: AgentEvaluation[],
): Promise<AgentDebateTurn> {
  const parsed = await chatJson<LlmDebateResponse>(
    'You simulate an investment panel debate and output strict JSON only.',
    `Idea title: ${idea.title}\nPitch: ${idea.pitch}\nYou are ${evaluation.role} agent.\nYour initial evaluation: ${JSON.stringify(evaluation)}.\nOther agents: ${JSON.stringify(evaluations.filter((item) => item.role !== evaluation.role))}.\nReturn ONLY JSON with keys: stance, agreesWith, rebuttals, revisedScore, closingNote.`,
  );

  const valid = new Set(AGENT_ROLES);
  const agreesWith = Array.isArray(parsed.agreesWith)
    ? parsed.agreesWith.filter((role): role is AgentRole => valid.has(role as AgentRole))
    : [];

  return {
    role: evaluation.role,
    stance: parsed.stance === 'bullish' || parsed.stance === 'neutral' || parsed.stance === 'bearish' ? parsed.stance : 'neutral',
    agreesWith,
    rebuttals: Array.isArray(parsed.rebuttals) ? parsed.rebuttals.slice(0, 3) : [],
    revisedScore: clampScore(Number(parsed.revisedScore) || evaluation.score),
    closingNote: parsed.closingNote || `${evaluation.role} agent maintains its position.`,
  };
}

async function moderate(
  idea: NormalizedIdea,
  evaluations: AgentEvaluation[],
  debate: AgentDebateTurn[],
): Promise<ModeratorSummary> {
  const parsed = await chatJson<LlmModeratorResponse>(
    'You are an investment moderator summarizing a panel. Output strict JSON only.',
    `Idea title: ${idea.title}\nPitch: ${idea.pitch}\nEvaluations: ${JSON.stringify(evaluations)}\nDebate: ${JSON.stringify(debate)}\nReturn ONLY JSON: consensus, disagreements, finalReasoning, confidence (0-100).`,
  );

  return {
    consensus: Array.isArray(parsed.consensus) ? parsed.consensus.slice(0, 4) : [],
    disagreements: Array.isArray(parsed.disagreements) ? parsed.disagreements.slice(0, 4) : [],
    finalReasoning: parsed.finalReasoning || 'Moderator summary unavailable.',
    confidence: clampScore(Number(parsed.confidence) || 0),
  };
}

function buildTranscript(
  idea: NormalizedIdea,
  evaluations: AgentEvaluation[],
  debate: AgentDebateTurn[],
  moderator: ModeratorSummary,
  finalAssessment: FinalAssessment,
): DebateTranscriptMessage[] {
  const byRole = Object.fromEntries(evaluations.map((e) => [e.role, e])) as Record<AgentRole, AgentEvaluation>;
  const findTurn = (role: AgentRole) => debate.find((d) => d.role === role);
  const messages: DebateTranscriptMessage[] = [];

  messages.push({
    id: 'mod-open',
    speaker: 'moderator',
    phase: 'moderation',
    text: `오늘 안건은 "${idea.title}"입니다. VC, Market, Tech, Growth, Risk 다섯 패널의 의견을 듣고 토론하겠습니다.`,
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
    text: `VC 의견 잘 들었습니다. 다만 시장에서는 ${byRole.market.summary} 특히 ${byRole.market.concerns[0] || '실제 통증의 강도'}가 핵심 변수입니다.`,
  });

  messages.push({
    id: 'rebut-vc-market',
    speaker: 'vc',
    phase: 'challenge',
    addressedTo: 'market',
    text: `Market 의견에 반박하면, 좁은 세그먼트에서도 수익 모델이 작동할 수 있습니다. ${findTurn('vc')?.rebuttals?.[0] || ''}`.trim(),
  });

  messages.push({
    id: 'open-tech',
    speaker: 'tech',
    phase: 'opening',
    addressedTo: 'moderator',
    text: `기술적으로는 ${byRole.tech.score}점입니다. ${byRole.tech.summary} ${idea.signals.isAiNative ? 'AI 활용 자체는 자연스럽습니다.' : '기술 난이도는 평이합니다.'}`,
  });

  messages.push({
    id: 'rebut-risk-tech',
    speaker: 'risk',
    phase: 'challenge',
    addressedTo: 'tech',
    text: `Tech의 낙관에 대해, ${idea.signals.isRegulated ? '규제 도메인 가능성' : '신뢰성·검증 부담'} 때문에 실행 난이도가 다시 올라갈 수 있습니다. ${findTurn('risk')?.rebuttals?.[0] || ''}`.trim(),
  });

  messages.push({
    id: 'open-growth',
    speaker: 'growth',
    phase: 'opening',
    addressedTo: 'risk',
    text: `Risk 의견 일부 공감하지만 성장 관점도 봐야 합니다. ${byRole.growth.summary} ${idea.signals.hasAcquisition ? '획득 채널 가설이 있는 점은 긍정적입니다.' : '첫 유입 채널 가설이 더 분명해야 합니다.'}`,
  });

  messages.push({
    id: 'rebut-market-growth',
    speaker: 'market',
    phase: 'response',
    addressedTo: 'growth',
    text: `Growth 의견을 받아, ${idea.signals.isB2b ? 'B2B 가격 견고성' : '커뮤니티 기반 확산'} 같은 장점은 있지만 첫 30명 사용자 시나리오는 더 구체적이어야 합니다.`,
  });

  messages.push({
    id: 'mod-mid',
    speaker: 'moderator',
    phase: 'moderation',
    text: `여기까지 정리하면, ${moderator.consensus[0] || '문제 정의의 명확성'}에는 패널이 어느 정도 동의했지만 ${moderator.disagreements[0] || '리스크와 성장성 해석'}에서 의견이 갈립니다.`,
  });

  messages.push({
    id: 'final-vc',
    speaker: 'vc',
    phase: 'response',
    addressedTo: 'moderator',
    text: `VC 최종 의견은 ${findTurn('vc')?.revisedScore || byRole.vc.score}점입니다. 차별화 정의와 가격 가설 검증이 핵심입니다.`,
  });

  messages.push({
    id: 'final-risk',
    speaker: 'risk',
    phase: 'response',
    addressedTo: 'moderator',
    text: `Risk 최종 의견은 ${findTurn('risk')?.revisedScore || byRole.risk.score}점입니다. ${byRole.risk.concerns[0] || '검증 부족'}이 해결되지 않으면 같은 점수를 유지합니다.`,
  });

  messages.push({
    id: 'mod-verdict',
    speaker: 'moderator',
    phase: 'verdict',
    text: `최종 판정은 ${finalAssessment.investmentVerdict.toUpperCase()}, 종합 점수 ${finalAssessment.overallScore}점, 모더레이터 신뢰도 ${moderator.confidence}점. 다음 2주 우선 액션은 "${finalAssessment.nextActions[0]}"입니다.`,
  });

  return messages;
}

function buildFinalAssessment(idea: NormalizedIdea, evaluations: AgentEvaluation[], debate: AgentDebateTurn[]): FinalAssessment {
  const overallScore = clampScore(average(debate.map((item) => item.revisedScore)));
  return {
    overallScore,
    investmentVerdict: investmentVerdictFromScore(overallScore),
    oneLiner: `${idea.title}에 대해 다중 역할 에이전트가 토론한 결과, ${overallScore}점 수준의 잠재력과 추가 검증 필요성이 확인되었습니다.`,
    topStrengths: uniqueNonEmpty(evaluations.flatMap((item) => item.strengths)).slice(0, 4),
    topRisks: uniqueNonEmpty(evaluations.flatMap((item) => item.concerns)).slice(0, 4),
    nextActions: uniqueNonEmpty(evaluations.flatMap((item) => item.recommendations)).slice(0, 4),
  };
}

export async function evaluateWithLLM(input: StartupIdeaInput): Promise<EvaluationResponse> {
  const idea = normalizeIdea(input);
  const evaluations = await Promise.all(AGENT_ROLES.map((role) => evaluateAgent(idea, role)));
  const debate = await Promise.all(evaluations.map((evaluation) => debateAgent(idea, evaluation, evaluations)));
  const moderator = await moderate(idea, evaluations, debate);
  const finalAssessment = buildFinalAssessment(idea, evaluations, debate);
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
      usedLLM: true,
      generatedAt: new Date().toISOString(),
    },
  };
}
