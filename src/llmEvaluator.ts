import { AGENT_DEFINITIONS, AGENT_ROLES } from './agents.js';
import { config } from './config.js';
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
      temperature: 0.55,
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

async function evaluateAgent(input: StartupIdeaInput, role: keyof typeof AGENT_DEFINITIONS): Promise<AgentEvaluation> {
  const agent = AGENT_DEFINITIONS[role];
  const parsed = await chatJson<LlmAgentResponse>(
    'You are a precise startup evaluator that outputs strict JSON only.',
    `You are ${agent.name}. Focus on ${agent.focus}. Evaluate this startup idea. Return ONLY valid JSON with keys: summary, strengths, concerns, recommendations, score, scoreBreakdown. Score must be 0-100. scoreBreakdown must include problemClarity, marketAttractiveness, feasibility, businessModelStrength, growthPotential, riskReadiness. Keep recommendations actionable and concise.\n\nIdea:\n${JSON.stringify(input, null, 2)}`,
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
  input: StartupIdeaInput,
  evaluation: AgentEvaluation,
  evaluations: AgentEvaluation[],
): Promise<AgentDebateTurn> {
  const parsed = await chatJson<LlmDebateResponse>(
    'You simulate a startup review panel and output strict JSON only.',
    `You are the ${evaluation.role} agent entering a debate round. Here is the startup idea:\n${JSON.stringify(input, null, 2)}\n\nYour initial evaluation:\n${JSON.stringify(evaluation, null, 2)}\n\nOther agent evaluations:\n${JSON.stringify(evaluations.filter((item) => item.role !== evaluation.role), null, 2)}\n\nReturn ONLY JSON with keys: stance, agreesWith, rebuttals, revisedScore, closingNote. stance must be bullish, neutral, or bearish. agreesWith should list role ids only. revisedScore must be 0-100.`,
  );

  const validRoles = new Set(AGENT_ROLES);
  const agreesWith = Array.isArray(parsed.agreesWith)
    ? parsed.agreesWith.filter((role): role is AgentDebateTurn['role'] => validRoles.has(role as AgentDebateTurn['role']))
    : [];

  return {
    role: evaluation.role,
    stance: parsed.stance === 'bullish' || parsed.stance === 'neutral' || parsed.stance === 'bearish' ? parsed.stance : 'neutral',
    agreesWith,
    rebuttals: Array.isArray(parsed.rebuttals) ? parsed.rebuttals.slice(0, 3) : [],
    revisedScore: clampScore(Number(parsed.revisedScore) || evaluation.score),
    closingNote: parsed.closingNote || `${evaluation.role} agent maintains the current position.`,
  };
}

async function moderate(
  input: StartupIdeaInput,
  evaluations: AgentEvaluation[],
  debate: AgentDebateTurn[],
): Promise<ModeratorSummary> {
  const parsed = await chatJson<LlmModeratorResponse>(
    'You are a moderator summarizing a startup investment committee. Output strict JSON only.',
    `Startup idea:\n${JSON.stringify(input, null, 2)}\n\nAgent evaluations:\n${JSON.stringify(evaluations, null, 2)}\n\nDebate round:\n${JSON.stringify(debate, null, 2)}\n\nReturn ONLY JSON with keys: consensus, disagreements, finalReasoning, confidence. confidence must be 0-100.`,
  );

  return {
    consensus: Array.isArray(parsed.consensus) ? parsed.consensus.slice(0, 4) : [],
    disagreements: Array.isArray(parsed.disagreements) ? parsed.disagreements.slice(0, 4) : [],
    finalReasoning: parsed.finalReasoning || 'Moderator summary unavailable.',
    confidence: clampScore(Number(parsed.confidence) || 0),
  };
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
      text: `${input.title}에 대한 제 1차 판단은 ${evaluation.score}점입니다. ${evaluation.summary}`,
    });

    const turn = debate.find((item) => item.role === evaluation.role);
    if (turn?.rebuttals?.length) {
      messages.push({
        id: `challenge-${evaluation.role}`,
        speaker: evaluation.role,
        phase: 'challenge',
        text: `다른 패널의 시각을 보니 ${turn.rebuttals.join(' ')} 따라서 제 수정 점수는 ${turn.revisedScore}점입니다.`,
      });
    }

    messages.push({
      id: `response-${evaluation.role}`,
      speaker: evaluation.role,
      phase: 'response',
      text: `${turn?.closingNote || `${evaluation.role} agent maintains the current position.`}`,
    });

    if (index === 1) {
      messages.push({
        id: 'moderation-mid',
        speaker: 'moderator',
        phase: 'moderation',
        text: `현재까지 패널은 ${moderator.consensus[0] || '핵심 문제 정의'}에는 공감하고 있지만, ${moderator.disagreements[0] || '성장성과 리스크 해석'}은 의견이 갈립니다.`,
      });
    }
  });

  messages.push({
    id: 'moderator-final',
    speaker: 'moderator',
    phase: 'moderation',
    text: moderator.finalReasoning,
  });

  messages.push({
    id: 'verdict-final',
    speaker: 'moderator',
    phase: 'verdict',
    text: `최종 판정은 ${finalAssessment.investmentVerdict.toUpperCase()}이며, 종합 점수는 ${finalAssessment.overallScore}점입니다.`,
  });

  return messages;
}

function buildFinalAssessment(input: StartupIdeaInput, evaluations: AgentEvaluation[], debate: AgentDebateTurn[]): FinalAssessment {
  const overallScore = clampScore(average(debate.map((item) => item.revisedScore)));
  return {
    overallScore,
    investmentVerdict: investmentVerdictFromScore(overallScore),
    oneLiner: `${input.title}에 대해 다중 역할 에이전트가 토론한 결과, ${overallScore}점 수준의 잠재력과 추가 검증 필요성이 확인되었습니다.`,
    topStrengths: uniqueNonEmpty(evaluations.flatMap((item) => item.strengths)).slice(0, 4),
    topRisks: uniqueNonEmpty(evaluations.flatMap((item) => item.concerns)).slice(0, 4),
    nextActions: uniqueNonEmpty(evaluations.flatMap((item) => item.recommendations)).slice(0, 4),
  };
}

export async function evaluateWithLLM(input: StartupIdeaInput): Promise<EvaluationResponse> {
  const evaluations = await Promise.all(AGENT_ROLES.map((role) => evaluateAgent(input, role)));
  const debate = await Promise.all(evaluations.map((evaluation) => debateAgent(input, evaluation, evaluations)));
  const moderator = await moderate(input, evaluations, debate);
  const finalAssessment = buildFinalAssessment(input, evaluations, debate);
  const transcript = buildTranscript(input, evaluations, debate, moderator, finalAssessment);

  return {
    input,
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
