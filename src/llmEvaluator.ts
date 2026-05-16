import { AGENT_DEFINITIONS, AGENT_ROLES } from './agents.js';
import { config } from './config.js';
import { AgentEvaluation, EvaluationResponse, FinalAssessment, StartupIdeaInput } from './types.js';
import { clampScore, investmentVerdictFromScore, uniqueNonEmpty } from './utils.js';

interface LlmAgentResponse {
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  score: number;
}

async function callOpenAi(input: StartupIdeaInput, role: keyof typeof AGENT_DEFINITIONS): Promise<LlmAgentResponse> {
  const agent = AGENT_DEFINITIONS[role];
  const prompt = `You are ${agent.name}. Focus on ${agent.focus}. Evaluate this startup idea. Return ONLY valid JSON with keys: summary, strengths, concerns, recommendations, score. Score must be 0-100. Keep recommendations actionable and concise.\n\nIdea:\n${JSON.stringify(input, null, 2)}`;

  const response = await fetch(`${config.openAiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openAiApiKey}`,
    },
    body: JSON.stringify({
      model: config.openAiModel,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a precise startup evaluator that outputs strict JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content from model');

  const parsed = JSON.parse(content) as LlmAgentResponse;
  return {
    summary: parsed.summary,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    score: clampScore(Number(parsed.score) || 0),
  };
}

export async function evaluateWithLLM(input: StartupIdeaInput): Promise<EvaluationResponse> {
  const agentResults = await Promise.all(
    AGENT_ROLES.map(async (role): Promise<AgentEvaluation> => {
      const result = await callOpenAi(input, role);
      return {
        role,
        score: result.score,
        verdict: result.score >= 75 ? 'strong' : result.score >= 50 ? 'mixed' : 'weak',
        summary: result.summary,
        strengths: result.strengths.slice(0, 4),
        concerns: result.concerns.slice(0, 4),
        recommendations: result.recommendations.slice(0, 3),
      };
    }),
  );

  const overallScore = clampScore(agentResults.reduce((sum, item) => sum + item.score, 0) / agentResults.length);
  const finalAssessment: FinalAssessment = {
    overallScore,
    investmentVerdict: investmentVerdictFromScore(overallScore),
    oneLiner: `${input.title}에 대해 다중 역할 에이전트가 평가한 결과, ${overallScore}점 수준의 잠재력과 추가 검증 필요성이 확인되었습니다.`,
    topStrengths: uniqueNonEmpty(agentResults.flatMap((item) => item.strengths)).slice(0, 4),
    topRisks: uniqueNonEmpty(agentResults.flatMap((item) => item.concerns)).slice(0, 4),
    nextActions: uniqueNonEmpty(agentResults.flatMap((item) => item.recommendations)).slice(0, 4),
  };

  return {
    input,
    evaluations: agentResults,
    finalAssessment,
    meta: {
      usedLLM: true,
      generatedAt: new Date().toISOString(),
    },
  };
}
