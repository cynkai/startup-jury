export type AgentRole = 'vc' | 'market' | 'tech' | 'growth' | 'risk';

export interface StartupIdeaInput {
  title: string;
  summary: string;
  targetCustomer?: string;
  customerSegment?: string;
  problem?: string;
  solution?: string;
  uniqueValue?: string;
  revenueModel?: string;
  pricingHint?: string;
  acquisitionChannel?: string;
  marketRegion?: string;
  whyNow?: string;
  teamStrength?: string;
  mvpScope?: string;
  competitors?: string[];
  stage?: 'idea' | 'prototype' | 'mvp' | 'launched';
}

export interface ScoreBreakdown {
  problemClarity: number;
  marketAttractiveness: number;
  feasibility: number;
  businessModelStrength: number;
  growthPotential: number;
  riskReadiness: number;
}

export interface AgentEvaluation {
  role: AgentRole;
  score: number;
  verdict: 'strong' | 'mixed' | 'weak';
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  scoreBreakdown: ScoreBreakdown;
}

export interface AgentDebateTurn {
  role: AgentRole;
  stance: 'bullish' | 'neutral' | 'bearish';
  agreesWith: AgentRole[];
  rebuttals: string[];
  revisedScore: number;
  closingNote: string;
}

export interface ModeratorSummary {
  consensus: string[];
  disagreements: string[];
  finalReasoning: string;
  confidence: number;
}

export interface FinalAssessment {
  overallScore: number;
  investmentVerdict: 'invest' | 'watch' | 'pass';
  oneLiner: string;
  topStrengths: string[];
  topRisks: string[];
  nextActions: string[];
}

export interface EvaluationResponse {
  input: StartupIdeaInput;
  evaluations: AgentEvaluation[];
  debate: AgentDebateTurn[];
  moderator: ModeratorSummary;
  finalAssessment: FinalAssessment;
  meta: {
    usedLLM: boolean;
    generatedAt: string;
    llmError?: string;
  };
}
